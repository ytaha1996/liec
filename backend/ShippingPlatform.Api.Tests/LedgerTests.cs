using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// ACC-09 to ACC-13, ACC-17 to ACC-19: the books. An invoice is not a row with
/// a total, it is a balanced entry — and once posted it is history.
/// </summary>
public class LedgerTests
{
    private static PostingService Posting(AppDbContext db) => new(db, new AuditService(db));
    private static InvoicePostingService InvoicePosting(AppDbContext db) =>
        new(db, Posting(db), new InvoiceNumberService(db), new AuditService(db));
    private static PaymentService Payments(AppDbContext db) => new(db, Posting(db), new AuditService(db));

    /// <summary>A container with one posted-ready draft invoice for one customer.</summary>
    private static async Task<(AppDbContext db, int invoiceId, int customerId)> BooksAsync(decimal total = 2_250_000m)
    {
        var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var customer = new Customer { Name = "ABBAS HIJAZI", PrimaryPhone = "+24106644300" };
        var shipment = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Customers.Add(customer);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();

        var invoice = new Invoice
        {
            Number = "INV/BEI-2801/001",
            ShipmentId = shipment.Id,
            CustomerId = customer.Id,
            CurrencyCode = "XAF",
            State = InvoiceState.Draft,
            UntaxedTotal = total,
            TaxTotal = 0m,
            GrandTotal = total,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        db.InvoiceLines.Add(new InvoiceLine
        {
            InvoiceId = invoice.Id, Label = "Freight", Amount = new Money(total, "XAF"),
        });
        await db.SaveChangesAsync();

        return (db, invoice.Id, customer.Id);
    }

    private static async Task<int> AccountIdAsync(AppDbContext db, string code)
        => (await db.Accounts.FirstAsync(a => a.Code == code)).Id;

    // ── ACC-09: balance ──────────────────────────────────────────────────────

    [Fact]
    public async Task Posting_an_invoice_writes_a_balanced_entry()
    {
        var (db, invoiceId, _) = await BooksAsync(2_250_000m);
        await using var _d = db;

        await InvoicePosting(db).PostAsync(invoiceId, adminUserId: 1);

        var entry = await db.JournalEntries.Include(e => e.Lines).SingleAsync();
        Assert.Equal(2_250_000m, entry.TotalDebit);
        Assert.Equal(2_250_000m, entry.TotalCredit);
        Assert.True(entry.IsBalanced);
    }

    [Fact]
    public async Task Freight_credits_services_and_debits_the_customer()
    {
        // The note is explicit: LIEC sells transport, so revenue is 713
        // Prestations de services and never 701 Facturations.
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;

        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var lines = await db.JournalEntryLines.Include(l => l.Account).ToListAsync();
        var debit = lines.Single(l => l.Debit > 0m);
        var credit = lines.Single(l => l.Credit > 0m);
        Assert.Equal("4111", debit.Account.Code);
        Assert.Equal("713", credit.Account.Code);
        Assert.DoesNotContain(lines, l => l.Account.Code == "701");
    }

    [Fact]
    public async Task An_unbalanced_entry_is_rejected_and_writes_nothing()
    {
        var (db, _, _) = await BooksAsync();
        await using var _d = db;
        var receivable = await AccountIdAsync(db, "4111");
        var revenue = await AccountIdAsync(db, "713");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Posting(db).PostAsync(JournalType.Sales, DateTime.UtcNow, "bad", "Test", 1, "XAF",
            [
                new PostingLine(receivable, 100m, 0m, "debit"),
                new PostingLine(revenue, 0m, 90m, "credit"),
            ], 1));

        Assert.Contains("does not balance", error.Message);
        Assert.Empty(await db.JournalEntries.ToListAsync());
    }

    [Fact]
    public async Task A_line_cannot_be_both_a_debit_and_a_credit()
    {
        var (db, _, _) = await BooksAsync();
        await using var _d = db;
        var account = await AccountIdAsync(db, "4111");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Posting(db).PostAsync(JournalType.Sales, DateTime.UtcNow, "bad", "Test", 1, "XAF",
                [new PostingLine(account, 100m, 100m, "both")], 1));
    }

    // ── ACC-10 and ACC-13: dates, periods, locking ───────────────────────────

    [Fact]
    public async Task An_entry_carries_a_date_a_period_and_a_journal()
    {
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;

        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var entry = await db.JournalEntries.Include(e => e.Journal).Include(e => e.Period).SingleAsync();
        Assert.Equal(JournalType.Sales, entry.Journal.Type);
        Assert.Equal(DateTime.UtcNow.Year, entry.Period.Year);
        Assert.NotEqual(default, entry.AccountingDate);
    }

    [Fact]
    public async Task A_closed_period_refuses_new_entries()
    {
        // Without this a late entry silently changes a month already reported.
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;
        var period = await Posting(db).PeriodForAsync(DateTime.UtcNow);
        period.State = PeriodState.Closed;
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).PostAsync(invoiceId, 1));

        Assert.Contains("closed", error.Message);
        Assert.Empty(await db.JournalEntries.ToListAsync());
    }

    // ── ACC-11: immutability ─────────────────────────────────────────────────

    [Fact]
    public async Task A_posted_invoice_cannot_be_posted_again()
    {
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        await Assert.ThrowsAsync<InvalidOperationException>(() => InvoicePosting(db).PostAsync(invoiceId, 1));
        Assert.Single(await db.JournalEntries.ToListAsync());
    }

    [Fact]
    public async Task A_posted_invoice_cannot_be_cancelled()
    {
        // Corrections happen by reversing, never by removing the document.
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).CancelAsync(invoiceId, "changed my mind", 1));

        Assert.Contains("credit note", error.Message);
        Assert.Equal(InvoiceState.Posted, (await db.Invoices.FindAsync(invoiceId))!.State);
    }

    [Fact]
    public async Task Cancelling_a_draft_needs_a_reason_and_frees_its_packages()
    {
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).CancelAsync(invoiceId, "  ", 1));

        await InvoicePosting(db).CancelAsync(invoiceId, "raised against the wrong container", 1);
        Assert.Equal(InvoiceState.Cancelled, (await db.Invoices.FindAsync(invoiceId))!.State);
    }

    // ── ACC-19: credit notes ─────────────────────────────────────────────────

    [Fact]
    public async Task A_credit_note_references_the_original_and_takes_its_own_number()
    {
        var (db, invoiceId, _) = await BooksAsync(2_250_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, null, "goods refused at destination", 1);

        Assert.Equal(InvoiceType.CreditNote, note.Type);
        Assert.Equal(invoiceId, note.ReversesInvoiceId);
        Assert.Equal("INV/BEI-2801/002", note.Number);
        Assert.Equal(2_250_000m, note.GrandTotal);
    }

    [Fact]
    public async Task A_posted_credit_note_reverses_the_entry()
    {
        var (db, invoiceId, _) = await BooksAsync(2_250_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);
        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, null, "goods refused", 1);

        await InvoicePosting(db).PostAsync(note.Id, 1);

        // Both entries balance, and together they cancel out on the receivable.
        var lines = await db.JournalEntryLines.Include(l => l.Account)
            .Where(l => l.Account.Code == "4111").ToListAsync();
        Assert.Equal(lines.Sum(l => l.Debit), lines.Sum(l => l.Credit));
    }

    [Fact]
    public async Task A_credit_note_cannot_exceed_the_invoice()
    {
        var (db, invoiceId, _) = await BooksAsync(1_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).CreditNoteAsync(invoiceId, 1_500m, "too much", 1));
    }

    [Fact]
    public async Task Only_a_posted_invoice_can_be_credited()
    {
        var (db, invoiceId, _) = await BooksAsync();
        await using var _d = db;

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).CreditNoteAsync(invoiceId, null, "not posted yet", 1));
    }

    // ── ACC-18: payments and allocation ──────────────────────────────────────

    [Fact]
    public async Task A_payment_debits_the_bank_and_credits_the_customer()
    {
        var (db, invoiceId, customerId) = await BooksAsync(1_000_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        await Payments(db).RecordAsync(customerId, 1_000_000m, "XAF", PaymentMethod.BankTransfer,
            "wire 123", null, [new AllocationRequest(invoiceId, 1_000_000m)], 1);

        var bankEntry = await db.JournalEntries.Include(e => e.Lines).ThenInclude(l => l.Account)
            .Include(e => e.Journal)
            .FirstAsync(e => e.Journal.Type == JournalType.Bank);
        Assert.True(bankEntry.IsBalanced);
        Assert.Equal("512", bankEntry.Lines.Single(l => l.Debit > 0m).Account.Code);
        Assert.Equal("4111", bankEntry.Lines.Single(l => l.Credit > 0m).Account.Code);
    }

    [Fact]
    public async Task Status_follows_the_allocation_rather_than_a_flag()
    {
        var (db, invoiceId, customerId) = await BooksAsync(1_000_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        Assert.Equal("Unpaid", (await Payments(db).BalanceOfAsync(invoiceId)).Status);

        await Payments(db).RecordAsync(customerId, 400_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoiceId, 400_000m)], 1);
        var partial = await Payments(db).BalanceOfAsync(invoiceId);
        Assert.Equal("Partially paid", partial.Status);
        Assert.Equal(600_000m, partial.Outstanding);

        await Payments(db).RecordAsync(customerId, 600_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoiceId, 600_000m)], 1);
        Assert.Equal("Paid", (await Payments(db).BalanceOfAsync(invoiceId)).Status);
    }

    [Fact]
    public async Task One_payment_can_settle_two_invoices()
    {
        // The case a boolean on the invoice cannot survive.
        var (db, firstId, customerId) = await BooksAsync(500_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(firstId, 1);

        var second = new Invoice
        {
            Number = "INV/BEI-2801/002", ShipmentId = 1, CustomerId = customerId, CurrencyCode = "XAF",
            State = InvoiceState.Draft, UntaxedTotal = 300_000m, GrandTotal = 300_000m,
        };
        db.Invoices.Add(second);
        await db.SaveChangesAsync();
        db.InvoiceLines.Add(new InvoiceLine { InvoiceId = second.Id, Label = "Freight", Amount = new Money(300_000m, "XAF") });
        await db.SaveChangesAsync();
        await InvoicePosting(db).PostAsync(second.Id, 1);

        await Payments(db).RecordAsync(customerId, 800_000m, "XAF", PaymentMethod.BankTransfer, "one transfer", null,
            [new AllocationRequest(firstId, 500_000m), new AllocationRequest(second.Id, 300_000m)], 1);

        Assert.Equal("Paid", (await Payments(db).BalanceOfAsync(firstId)).Status);
        Assert.Equal("Paid", (await Payments(db).BalanceOfAsync(second.Id)).Status);
    }

    [Fact]
    public async Task An_invoice_cannot_be_over_allocated()
    {
        var (db, invoiceId, customerId) = await BooksAsync(100_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Payments(db).RecordAsync(customerId, 200_000m, "XAF", PaymentMethod.Cash, null, null,
                [new AllocationRequest(invoiceId, 200_000m)], 1));

        Assert.Contains("outstanding", error.Message);
        Assert.Empty(await db.Payments.ToListAsync());
    }

    [Fact]
    public async Task Allocations_cannot_exceed_the_payment()
    {
        var (db, invoiceId, customerId) = await BooksAsync(100_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Payments(db).RecordAsync(customerId, 50_000m, "XAF", PaymentMethod.Cash, null, null,
                [new AllocationRequest(invoiceId, 80_000m)], 1));
    }

    [Fact]
    public async Task An_unposted_invoice_cannot_be_paid()
    {
        var (db, invoiceId, customerId) = await BooksAsync();
        await using var _d = db;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Payments(db).RecordAsync(customerId, 100m, "XAF", PaymentMethod.Cash, null, null,
                [new AllocationRequest(invoiceId, 100m)], 1));
    }

    [Fact]
    public async Task A_credit_note_reduces_what_is_outstanding()
    {
        var (db, invoiceId, _) = await BooksAsync(1_000_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);
        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, 400_000m, "partial goodwill", 1);
        await InvoicePosting(db).PostAsync(note.Id, 1);

        var balance = await Payments(db).BalanceOfAsync(invoiceId);
        Assert.Equal(600_000m, balance.Outstanding);
    }

    // ── ACC-17: customer balances ────────────────────────────────────────────

    [Fact]
    public async Task Customer_balance_is_invoiced_less_credits_less_payments()
    {
        var (db, invoiceId, customerId) = await BooksAsync(1_000_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);
        await Payments(db).RecordAsync(customerId, 250_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoiceId, 250_000m)], 1);

        var balance = (await Payments(db).CustomerBalancesAsync()).Single();
        Assert.Equal(1_000_000m, balance.Invoiced);
        Assert.Equal(250_000m, balance.Paid);
        Assert.Equal(750_000m, balance.Outstanding);
    }

    // ── ACC-02: accounts are data ────────────────────────────────────────────

    [Fact]
    public async Task The_chart_is_seeded_as_data_and_settings_point_at_it()
    {
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var settings = await db.AccountingSettings.SingleAsync();
        var revenue = await db.Accounts.FirstAsync(a => a.Id == settings.RevenueAccountId);
        var receivable = await db.Accounts.FirstAsync(a => a.Id == settings.ReceivableAccountId);

        Assert.Equal("713", revenue.Code);
        Assert.Equal("Prestations de services", revenue.NameFr);
        Assert.Equal("4111", receivable.Code);
        // 701 exists in the chart but is never what revenue points at.
        Assert.NotEqual("701", revenue.Code);
    }

    [Fact]
    public async Task Seeding_twice_changes_nothing()
    {
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);
        var before = await db.Accounts.CountAsync();

        await AccountingSeed.EnsureAsync(db);

        Assert.Equal(before, await db.Accounts.CountAsync());
        Assert.Single(await db.AccountingSettings.ToListAsync());
    }

    // ── Free carriage (real 925 data has three of them) ──────────────────────

    [Fact]
    public async Task A_free_package_still_produces_an_invoice_the_customer_can_hold()
    {
        var (db, invoiceId, _) = await BooksAsync(0m);
        await using var _d = db;

        var posted = await InvoicePosting(db).PostAsync(invoiceId, 1);

        Assert.Equal(InvoiceState.Posted, posted.State);
        Assert.NotNull(posted.PostedAt);
    }

    [Fact]
    public async Task A_zero_invoice_writes_nothing_to_the_ledger()
    {
        // A zero debit against a zero credit is noise in the general ledger, and
        // the trial balance would list an account that never moved.
        var (db, invoiceId, _) = await BooksAsync(0m);
        await using var _d = db;

        var posted = await InvoicePosting(db).PostAsync(invoiceId, 1);

        Assert.Null(posted.JournalEntryId);
        Assert.Empty(db.JournalEntries);
        Assert.Empty(db.JournalEntryLines);
    }

    [Fact]
    public async Task A_zero_invoice_is_still_frozen_once_posted()
    {
        // ACC-11 holds regardless of the amount.
        var (db, invoiceId, _) = await BooksAsync(0m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).PostAsync(invoiceId, 1));
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).CancelAsync(invoiceId, "changed my mind", 1));
    }

    [Fact]
    public async Task A_zero_invoice_owes_nothing_so_it_reads_as_paid()
    {
        var (db, invoiceId, _) = await BooksAsync(0m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var balance = await Payments(db).BalanceOfAsync(invoiceId);

        Assert.Equal(0m, balance.Outstanding);
        Assert.Equal("Paid", balance.Status);
    }

    [Fact]
    public async Task A_real_amount_still_refuses_to_post_without_an_entry()
    {
        // The zero path must not become a way for a real invoice to skip the
        // ledger — anything non-zero still writes its entry.
        var (db, invoiceId, _) = await BooksAsync(120_000m);
        await using var _d = db;

        var posted = await InvoicePosting(db).PostAsync(invoiceId, 1);

        Assert.NotNull(posted.JournalEntryId);
        Assert.Single(db.JournalEntries);
    }
    // ── ACC-16: the day tax is switched on ──────────────────────────────────
    //
    // Nothing sets a non-zero tax today — Finance has not chosen a treatment —
    // so the tax branch in InvoicePostingService would otherwise run for the
    // first time in production. These build a taxed invoice by hand to prove it
    // now.

    /// <summary>An invoice carrying tax, ready to post.</summary>
    private static async Task<(AppDbContext db, int invoiceId)> TaxedBooksAsync(decimal net, decimal tax)
    {
        var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var customer = new Customer { Name = "ABBAS HIJAZI", PrimaryPhone = "+24106644300" };
        var shipment = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Customers.Add(customer);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();

        var invoice = new Invoice
        {
            Number = "INV/BEI-2801/001", ShipmentId = shipment.Id, CustomerId = customer.Id,
            CurrencyCode = "XAF", State = InvoiceState.Draft,
            UntaxedTotal = net, TaxTotal = tax, GrandTotal = net + tax,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        db.InvoiceLines.Add(new InvoiceLine
        {
            InvoiceId = invoice.Id, Label = "Freight", Amount = new Money(net, "XAF"), TaxAmount = tax,
        });
        await db.SaveChangesAsync();
        return (db, invoice.Id);
    }

    [Fact]
    public async Task A_taxed_invoice_splits_revenue_from_tax_and_still_balances()
    {
        var (db, invoiceId) = await TaxedBooksAsync(net: 1_000_000m, tax: 180_000m);
        await using var _d = db;

        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var entry = await db.JournalEntries.Include(e => e.Lines).ThenInclude(l => l.Account).SingleAsync();
        Assert.True(entry.IsBalanced);
        // The customer owes the gross; revenue takes only the net.
        Assert.Equal(1_180_000m, entry.TotalDebit);
        Assert.Equal(1_180_000m, entry.TotalCredit);

        var receivable = entry.Lines.Single(l => l.Account.Code == "4111");
        var revenue = entry.Lines.Single(l => l.Account.Code == "713");
        var taxLine = entry.Lines.Single(l => l.Account.Code == "4457");

        Assert.Equal(1_180_000m, receivable.Debit);
        Assert.Equal(1_000_000m, revenue.Credit);
        Assert.Equal(180_000m, taxLine.Credit);
    }

    [Fact]
    public async Task Tax_never_gets_folded_into_the_revenue_account()
    {
        // The whole point of a separate tax account: money held for the state is
        // not turnover, and a return built from account 713 must not include it.
        var (db, invoiceId) = await TaxedBooksAsync(net: 1_000_000m, tax: 180_000m);
        await using var _d = db;

        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var revenue = await db.JournalEntryLines
            .Include(l => l.Account)
            .Where(l => l.Account.Code == "713")
            .SumAsync(l => l.Credit);

        Assert.Equal(1_000_000m, revenue);
        Assert.NotEqual(1_180_000m, revenue);
    }

    [Fact]
    public async Task A_taxed_credit_note_reverses_both_sides()
    {
        var (db, invoiceId) = await TaxedBooksAsync(net: 1_000_000m, tax: 180_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, null, "cancelled shipment", 1);
        await InvoicePosting(db).PostAsync(note.Id, 1);

        // Every account nets to zero once the reversal is posted.
        foreach (var code in new[] { "4111", "713" })
        {
            var lines = await db.JournalEntryLines.Include(l => l.Account)
                .Where(l => l.Account.Code == code).ToListAsync();
            Assert.Equal(lines.Sum(l => l.Debit), lines.Sum(l => l.Credit));
        }
    }

    [Fact]
    public async Task A_taxed_invoice_with_no_tax_account_configured_is_refused_rather_than_guessed()
    {
        var (db, invoiceId) = await TaxedBooksAsync(net: 1_000_000m, tax: 180_000m);
        await using var _d = db;
        var settings = await db.AccountingSettings.SingleAsync();
        settings.TaxAccountId = null;
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => InvoicePosting(db).PostAsync(invoiceId, 1));

        Assert.Contains("tax account", ex.Message, StringComparison.OrdinalIgnoreCase);
        // Refused before anything was written.
        Assert.Empty(db.JournalEntries);
        Assert.Equal(InvoiceState.Draft, (await db.Invoices.SingleAsync(i => i.Id == invoiceId)).State);
    }
    [Fact]
    public async Task A_partial_credit_apportions_the_tax_rather_than_crediting_it_all_as_revenue()
    {
        var (db, invoiceId) = await TaxedBooksAsync(net: 1_000_000m, tax: 180_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        // Half the gross back: the tax must come back in the same proportion.
        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, 590_000m, "half returned", 1);

        Assert.Equal(590_000m, note.GrandTotal);
        Assert.Equal(90_000m, note.TaxTotal);
        Assert.Equal(500_000m, note.UntaxedTotal);
        // Whatever the rounding, the split always sums back to what was credited.
        Assert.Equal(note.GrandTotal, note.UntaxedTotal + note.TaxTotal);
    }

    [Fact]
    public async Task A_credit_against_an_untaxed_invoice_carries_no_tax_line()
    {
        // Today's normal case — every invoice resolves to zero tax.
        var (db, invoiceId, _) = await BooksAsync(2_250_000m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, null, "goodwill", 1);
        await InvoicePosting(db).PostAsync(note.Id, 1);

        Assert.Equal(0m, note.TaxTotal);
        Assert.Equal(2_250_000m, note.UntaxedTotal);
        var lines = await db.JournalEntryLines.Include(l => l.Account)
            .Where(l => l.Account.Code == "4457").ToListAsync();
        Assert.Empty(lines);
    }

    [Fact]
    public async Task An_odd_split_still_sums_back_to_the_amount_credited()
    {
        // A ratio that does not divide cleanly is where an apportionment goes
        // a franc astray and the entry stops balancing.
        var (db, invoiceId) = await TaxedBooksAsync(net: 999_999m, tax: 33_333m);
        await using var _d = db;
        await InvoicePosting(db).PostAsync(invoiceId, 1);

        var note = await InvoicePosting(db).CreditNoteAsync(invoiceId, 111_111m, "partial", 1);
        await InvoicePosting(db).PostAsync(note.Id, 1);

        Assert.Equal(note.GrandTotal, note.UntaxedTotal + note.TaxTotal);
        var entry = await db.JournalEntries.Include(e => e.Lines)
            .SingleAsync(e => e.Id == note.JournalEntryId);
        Assert.True(entry.IsBalanced);
        Assert.Equal(111_111m, entry.TotalDebit);
    }
}
