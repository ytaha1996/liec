using System.Reflection;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// The traps from Finance's note, held down by the model itself rather than by
/// remembering. Each of these failed silently once in the Odoo implementation.
/// </summary>
public class ModelGuardTests
{
    // ── Trap 2: codes compared by prefix ────────────────────────────────────

    [Theory]
    [InlineData("4111", "41110")]
    [InlineData("40", "401")]
    [InlineData("70", "701")]
    [InlineData("701", "7011")]
    public async Task Two_accounts_whose_codes_share_a_prefix_are_different_accounts(string shorter, string longer)
    {
        await using var db = TestDb.Create();
        db.Accounts.Add(new Account { Code = shorter, NameEn = "Shorter", Type = AccountType.Revenue });
        db.Accounts.Add(new Account { Code = longer, NameEn = "Longer", Type = AccountType.Revenue });
        await db.SaveChangesAsync();

        var found = await db.Accounts.SingleAsync(a => a.Code == shorter);

        Assert.Equal("Shorter", found.NameEn);
        Assert.Equal(2, await db.Accounts.CountAsync());
    }

    [Fact]
    public async Task The_seeded_chart_holds_codes_that_would_collide_under_prefix_matching()
    {
        // 40 (payables) and 4111 (customer receivable) both begin with "4"; 70
        // and 701 and 713 all begin with "7". A prefix match would conflate them.
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var codes = await db.Accounts.Select(a => a.Code).ToListAsync();

        Assert.Contains("40", codes);
        Assert.Contains("4111", codes);
        Assert.Contains("701", codes);
        Assert.Contains("713", codes);
        foreach (var code in codes)
            Assert.Single(codes.Where(c => c == code));
    }

    [Fact]
    public async Task Revenue_is_mapped_to_the_services_account_and_never_to_merchandise_sales()
    {
        // Trap 1: freight is a service. 701 is merchandise sales, and revenue
        // sitting there for weeks is exactly what the note describes.
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var settings = await db.AccountingSettings.SingleAsync();
        var revenue = await db.Accounts.SingleAsync(a => a.Id == settings.RevenueAccountId);

        Assert.Equal("713", revenue.Code);
        Assert.NotEqual("701", revenue.Code);
        Assert.Equal(AccountType.Revenue, revenue.Type);
    }

    [Fact]
    public async Task Every_mapped_account_is_one_you_can_actually_post_to()
    {
        await using var db = TestDb.Create();
        await AccountingSeed.EnsureAsync(db);

        var settings = await db.AccountingSettings.SingleAsync();
        foreach (var id in new[] { settings.ReceivableAccountId, settings.RevenueAccountId, settings.BankAccountId })
        {
            Assert.NotNull(id);
            var account = await db.Accounts.SingleAsync(a => a.Id == id);
            Assert.True(account.IsPostable, $"{account.Display} is a heading, not a posting account.");
            Assert.True(account.IsActive);
        }
    }

    // ── Trap 4: deleting a parent takes accounting records with it ──────────

    [Fact]
    public void A_container_cannot_cascade_its_packages_away()
    {
        // Once packages carry invoice lines, a cascade would destroy the books
        // rather than refuse the delete.
        using var db = TestDb.Create();
        var fk = db.Model.FindEntityType(typeof(Package))!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(Shipment));

        Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior);
    }

    [Theory]
    [InlineData(typeof(Invoice), typeof(Shipment))]
    [InlineData(typeof(Invoice), typeof(Customer))]
    [InlineData(typeof(Payment), typeof(Customer))]
    [InlineData(typeof(JournalEntryLine), typeof(Account))]
    public void No_accounting_record_can_be_cascaded_away_by_deleting_its_parent(Type dependent, Type principal)
    {
        using var db = TestDb.Create();
        var fk = db.Model.FindEntityType(dependent)!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == principal);

        Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior);
    }

    // ── ACC-14: an amount never travels without its currency ────────────────

    [Fact]
    public void No_accounting_dto_exposes_a_bare_amount()
    {
        // A decimal called "Amount" with no currency beside it is the ambiguity
        // that put a USD figure on a EUR document.
        var offenders = new List<string>();
        foreach (var type in new[] { typeof(MoneyDto), typeof(InvoiceLineDto), typeof(InvoiceSummaryDto), typeof(InvoiceDetailDto) })
        {
            var props = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);
            var hasCurrency = props.Any(p => p.Name.Contains("Currency", StringComparison.OrdinalIgnoreCase));
            var bare = props.Where(p => p.PropertyType == typeof(decimal) || p.PropertyType == typeof(decimal?));

            foreach (var p in bare)
            {
                // MoneyDto carries its own currency; the others must either
                // carry one themselves or hand the figure over inside a Money.
                if (!hasCurrency) offenders.Add($"{type.Name}.{p.Name}");
            }
        }

        Assert.Empty(offenders);
    }

    [Fact]
    public void The_money_type_refuses_to_add_across_currencies()
    {
        var xaf = new Money(550_000m, "XAF");
        var usd = new Money(1_000m, "USD");

        Assert.Throws<InvalidOperationException>(() => xaf.Plus(usd));
        Assert.Throws<InvalidOperationException>(() => xaf.Minus(usd));
        Assert.Equal(1_100_000m, xaf.Plus(new Money(550_000m, "XAF")).Amount);
    }

    // ── The names the UI renders ────────────────────────────────────────────

    [Theory]
    [InlineData(typeof(ShipmentStatus), "Draft,Scheduled,ReadyToDepart,Departed,Arrived,Closed,Cancelled")]
    [InlineData(typeof(PackageStatus), "Draft,Received,Packed,ReadyToShip,Shipped,ArrivedAtDestination,ReadyForHandout,HandedOut,Cancelled")]
    [InlineData(typeof(SupplyOrderStatus), "Draft,Approved,Ordered,DeliveredToWarehouse,PackedIntoPackage,Closed,Cancelled")]
    [InlineData(typeof(PricingConfigStatus), "Draft,Scheduled,Active,Retired")]
    [InlineData(typeof(PriceBasis), "Unknown,Cbm,Weight,Minimum,Custom")]
    [InlineData(typeof(InvoiceState), "Draft,Posted,Cancelled")]
    [InlineData(typeof(InvoiceType), "Invoice,CreditNote")]
    public void An_enum_name_is_a_contract_the_UI_renders_by(Type enumType, string expected)
    {
        // These names leave the API as strings and the frontend maps each one to
        // a human label and a badge colour. Renaming a member here without
        // updating src/constants/status*.ts produces a blank badge, which reads
        // as "no status" rather than as a bug — so the rename must fail here
        // first. The matching frontend guard is status-display.test.ts.
        Assert.Equal(expected.Split(','), Enum.GetNames(enumType));
    }

    [Fact]
    public async Task The_derived_payment_statuses_are_the_words_the_UI_expects()
    {
        // Not an enum — PaymentService composes these strings, and the frontend
        // keys its badge colours off them verbatim.
        await using var db = TestDb.Create();
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
            UntaxedTotal = 1_000_000m, GrandTotal = 1_000_000m,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        db.InvoiceLines.Add(new InvoiceLine { InvoiceId = invoice.Id, Label = "Freight", Amount = new Money(1_000_000m, "XAF") });
        await db.SaveChangesAsync();

        var posting = new PostingService(db, new AuditService(db));
        var invoicing = new InvoicePostingService(db, posting, new InvoiceNumberService(db), new AuditService(db));
        var payments = new PaymentService(db, posting, new AuditService(db));

        await invoicing.PostAsync(invoice.Id, 1);
        Assert.Equal("Unpaid", (await payments.BalanceOfAsync(invoice.Id)).Status);

        await payments.RecordAsync(customer.Id, 400_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoice.Id, 400_000m)], 1);
        Assert.Equal("Partially paid", (await payments.BalanceOfAsync(invoice.Id)).Status);

        await payments.RecordAsync(customer.Id, 600_000m, "XAF", PaymentMethod.Cash, null, null,
            [new AllocationRequest(invoice.Id, 600_000m)], 1);
        Assert.Equal("Paid", (await payments.BalanceOfAsync(invoice.Id)).Status);
    }
}
