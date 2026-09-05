using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Tests;

/// <summary>ACC-17 and ACC-20: the reports Finance reconciles against.</summary>
public class FinancialReportTests
{
    private static PostingService Posting(AppDbContext db) => new(db, new AuditService(db));
    private static InvoicePostingService InvoicePosting(AppDbContext db) =>
        new(db, Posting(db), new InvoiceNumberService(db), new AuditService(db));
    private static PaymentService Payments(AppDbContext db) => new(db, Posting(db), new AuditService(db));

    /// <summary>One customer, one posted invoice of the given age and amount.</summary>
    private static async Task<(AppDbContext db, int invoiceId, int customerId)> PostedAsync(
        decimal total, int daysOld = 0, AppDbContext? existing = null, string name = "ABBAS HIJAZI")
    {
        var db = existing ?? TestDb.Create();
        if (existing is null) await AccountingSeed.EnsureAsync(db);

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Name == name);
        if (customer is null)
        {
            customer = new Customer { Name = name, PrimaryPhone = $"+2410{Random.Shared.Next(1000000, 9999999)}" };
            db.Customers.Add(customer);
        }
        var shipment = await db.Shipments.FirstOrDefaultAsync();
        if (shipment is null)
        {
            shipment = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
            db.Shipments.Add(shipment);
        }
        await db.SaveChangesAsync();

        var date = DateTime.UtcNow.AddDays(-daysOld);
        var invoice = new Invoice
        {
            Number = await new InvoiceNumberService(db).NextAsync(shipment.Id),
            ShipmentId = shipment.Id,
            CustomerId = customer.Id,
            CurrencyCode = "XAF",
            State = InvoiceState.Draft,
            InvoiceDate = date,
            AccountingDate = date,
            UntaxedTotal = total,
            GrandTotal = total,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        db.InvoiceLines.Add(new InvoiceLine { InvoiceId = invoice.Id, Label = "Freight", Amount = new Money(total, "XAF") });
        await db.SaveChangesAsync();

        await InvoicePosting(db).PostAsync(invoice.Id, 1);
        return (db, invoice.Id, customer.Id);
    }

    private static async Task<ReportResultDto> Run(AppDbContext db, string key, ReportFilter? filter = null)
        => (await new ReportService(db).RunAsync(key, filter ?? new ReportFilter()))!;

    [Fact]
    public async Task The_catalogue_offers_the_financial_reports()
    {
        await using var db = TestDb.Create();
        var keys = new ReportService(db).Catalogue.Select(c => c.Key).ToList();

        Assert.Contains("aged-receivable", keys);
        Assert.Contains("revenue-by-period", keys);
        Assert.Contains("general-ledger", keys);
        Assert.Contains("trial-balance", keys);
    }

    [Fact]
    public async Task The_trial_balance_agrees()
    {
        // The whole purpose of the report: if these differ, the books are broken.
        var (db, _, _) = await PostedAsync(2_250_000m);
        await using var _d = db;

        var report = await Run(db, "trial-balance");

        Assert.Equal(report.Totals["debit"], report.Totals["credit"]);
        Assert.Equal(0m, Convert.ToDecimal(report.Totals["balance"]));
    }

    [Fact]
    public async Task The_trial_balance_still_agrees_after_a_payment_and_a_credit_note()
    {
        var (db, invoiceId, customerId) = await PostedAsync(1_000_000m);
        await using var _d = db;
        await Payments(db).RecordAsync(customerId, 400_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoiceId, 400_000m)], 1);
        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, 100_000m, "goodwill", 1);
        await InvoicePosting(db).PostAsync(note.Id, 1);

        var report = await Run(db, "trial-balance");

        Assert.Equal(report.Totals["debit"], report.Totals["credit"]);
    }

    [Fact]
    public async Task The_general_ledger_names_the_account_on_every_line()
    {
        // Trap 1: revenue once landed in a merchandise account for weeks without
        // erroring. Printing the account beside the amount is how that surfaces.
        var (db, _, _) = await PostedAsync(500_000m);
        await using var _d = db;

        var report = await Run(db, "general-ledger");

        Assert.NotEmpty(report.Rows);
        foreach (var row in report.Rows)
            Assert.Matches(@"^\d+ \w", row["account"]!.ToString()!);
        Assert.Contains(report.Rows, r => r["account"]!.ToString()!.StartsWith("713"));
        Assert.Equal(report.Totals["debit"], report.Totals["credit"]);
    }

    [Fact]
    public async Task Aged_receivable_puts_a_fresh_invoice_in_the_current_bucket()
    {
        var (db, _, _) = await PostedAsync(750_000m, daysOld: 5);
        await using var _d = db;

        var row = (await Run(db, "aged-receivable")).Rows.Single();

        Assert.Equal(750_000m, Convert.ToDecimal(row["current"]));
        Assert.Equal(0m, Convert.ToDecimal(row["d90"]));
        Assert.Equal(750_000m, Convert.ToDecimal(row["total"]));
    }

    [Theory]
    [InlineData(30, "current")]   // exactly 30 days is still current
    [InlineData(31, "d30")]
    [InlineData(60, "d30")]
    [InlineData(61, "d60")]
    [InlineData(90, "d60")]
    [InlineData(91, "d90")]
    public async Task Ageing_boundaries_land_in_the_right_bucket(int daysOld, string expectedBucket)
    {
        var (db, _, _) = await PostedAsync(100_000m, daysOld);
        await using var _d = db;

        var row = (await Run(db, "aged-receivable")).Rows.Single();

        Assert.Equal(100_000m, Convert.ToDecimal(row[expectedBucket]));
        foreach (var other in new[] { "current", "d30", "d60", "d90" }.Where(b => b != expectedBucket))
            Assert.Equal(0m, Convert.ToDecimal(row[other]));
    }

    [Fact]
    public async Task A_settled_invoice_drops_off_the_ageing_report()
    {
        var (db, invoiceId, customerId) = await PostedAsync(200_000m, daysOld: 45);
        await using var _d = db;
        await Payments(db).RecordAsync(customerId, 200_000m, "XAF", PaymentMethod.BankTransfer, null, null,
            [new AllocationRequest(invoiceId, 200_000m)], 1);

        Assert.Empty((await Run(db, "aged-receivable")).Rows);
    }

    [Fact]
    public async Task A_part_paid_invoice_shows_only_what_is_still_owed()
    {
        var (db, invoiceId, customerId) = await PostedAsync(500_000m, daysOld: 45);
        await using var _d = db;
        await Payments(db).RecordAsync(customerId, 200_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoiceId, 200_000m)], 1);

        var row = (await Run(db, "aged-receivable")).Rows.Single();
        Assert.Equal(300_000m, Convert.ToDecimal(row["d30"]));
    }

    [Fact]
    public async Task Revenue_by_period_reads_the_ledger_not_the_operational_figures()
    {
        var (db, _, _) = await PostedAsync(1_500_000m);
        await using var _d = db;

        var report = await Run(db, "revenue-by-period");

        Assert.Equal(1_500_000m, Convert.ToDecimal(report.Totals["revenue"]));
        Assert.Equal($"{DateTime.UtcNow:yyyy-MM}", report.Rows.Single()["month"]);
    }

    [Fact]
    public async Task A_draft_invoice_is_in_no_report_because_it_is_not_in_the_books()
    {
        // ACC-04: generation does not touch the ledger, so nothing shows until
        // Finance posts it.
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);
        var customer = new Customer { Name = "FOUAD HAREB", PrimaryPhone = "+24102222261" };
        var shipment = new Shipment { RefCode = "BEI-2802", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Customers.Add(customer);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        db.Invoices.Add(new Invoice
        {
            Number = "INV/BEI-2802/001", ShipmentId = shipment.Id, CustomerId = customer.Id,
            CurrencyCode = "XAF", State = InvoiceState.Draft, UntaxedTotal = 900_000m, GrandTotal = 900_000m,
        });
        await db.SaveChangesAsync();

        Assert.Empty((await Run(db, "aged-receivable")).Rows);
        Assert.Empty((await Run(db, "general-ledger")).Rows);
        Assert.Equal(0m, Convert.ToDecimal((await Run(db, "revenue-by-period")).Totals["revenue"]));
    }
}
