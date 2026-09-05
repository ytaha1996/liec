using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Tests;

/// <summary>ACC-03 to ACC-06: what gets invoiced, once, as a draft.</summary>
public class InvoiceGenerationServiceTests
{
    private static InvoiceGenerationService Service(Data.AppDbContext db)
        => new(db, new InvoiceNumberService(db), new AuditService(db));

    private static async Task<(Data.AppDbContext db, int shipmentId)> ContainerAsync()
    {
        var db = TestDb.Create();
        db.Customers.AddRange(
            new Customer { Name = "ABBAS HIJAZI", PrimaryPhone = "+24106644300" },
            new Customer { Name = "FOUAD HAREB", PrimaryPhone = "+24102222261" });
        var shipment = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        return (db, shipment.Id);
    }

    private static Package Cargo(int shipmentId, int customerId, decimal charge,
        decimal fee = 0m, decimal discount = 0m, PackageStatus status = PackageStatus.Packed) => new()
    {
        ShipmentId = shipmentId,
        CustomerId = customerId,
        Status = status,
        Cbm = 2m,
        WeightKg = 285m,
        Currency = "XAF",
        ChargeAmount = charge,
        FeeAmount = fee,
        DiscountAmount = discount,
        PriceBasis = PriceBasis.Cbm,
    };

    [Fact]
    public async Task Creates_one_invoice_per_customer_with_a_line_per_package()
    {
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.AddRange(
            Cargo(id, 1, 550_000m), Cargo(id, 1, 120_000m), Cargo(id, 2, 312_500m));
        await db.SaveChangesAsync();

        var result = await Service(db).GenerateForShipmentAsync(id, adminUserId: 1);

        Assert.Equal(2, result.Created);
        Assert.Equal(3, result.PackagesBilled);
        var invoices = await db.Invoices.Include(i => i.Lines).OrderBy(i => i.CustomerId).ToListAsync();
        Assert.Equal(2, invoices[0].Lines.Count);
        Assert.Single(invoices[1].Lines);
        Assert.Equal(670_000m, invoices[0].GrandTotal);
    }

    [Fact]
    public async Task Generation_always_produces_drafts()
    {
        // ACC-04: nothing here may touch the ledger. Finance reviews, then posts.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, 550_000m));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.All(await db.Invoices.ToListAsync(), i => Assert.Equal(InvoiceState.Draft, i.State));
    }

    [Fact]
    public async Task Pressing_the_button_twice_changes_nothing()
    {
        // ACC-05: the operator will do this.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.AddRange(Cargo(id, 1, 550_000m), Cargo(id, 2, 312_500m));
        await db.SaveChangesAsync();

        var first = await Service(db).GenerateForShipmentAsync(id, 1);
        var second = await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.Equal(2, first.Created);
        Assert.Equal(0, second.Created);
        Assert.Equal(2, await db.Invoices.CountAsync());
        Assert.Equal(2, await db.InvoiceLines.CountAsync());
    }

    [Fact]
    public async Task A_package_added_later_gets_its_own_second_invoice()
    {
        // ACC-05: it must not duplicate or overwrite the first.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, 550_000m));
        await db.SaveChangesAsync();
        await Service(db).GenerateForShipmentAsync(id, 1);

        db.Packages.Add(Cargo(id, 1, 120_000m));
        await db.SaveChangesAsync();
        var second = await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.Equal(1, second.Created);
        var numbers = await db.Invoices.Select(i => i.Number).OrderBy(n => n).ToListAsync();
        Assert.Equal(new[] { "INV/BEI-2801/001", "INV/BEI-2801/002" }, numbers);
        Assert.Equal(550_000m, (await db.Invoices.FirstAsync(i => i.Number.EndsWith("001"))).GrandTotal);
    }

    [Fact]
    public async Task Cancelled_cargo_is_never_billed()
    {
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.AddRange(
            Cargo(id, 1, 550_000m),
            Cargo(id, 1, 999_999m, status: PackageStatus.Cancelled));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.Equal(550_000m, (await db.Invoices.SingleAsync()).GrandTotal);
    }

    [Fact]
    public async Task The_line_total_is_freight_plus_fee_less_discount()
    {
        // The same net the Bill of Lading shows, so the two documents agree.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, charge: 1_306_250m, fee: 69_750m, discount: 0m));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.Equal(1_376_000m, (await db.InvoiceLines.SingleAsync()).Amount.Amount);
        Assert.Equal(1_376_000m, (await db.Invoices.SingleAsync()).GrandTotal);
    }

    [Fact]
    public async Task Every_amount_carries_its_currency()
    {
        // ACC-14: no bare numbers anywhere in the books.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, 550_000m));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        Assert.Equal("XAF", (await db.InvoiceLines.SingleAsync()).Amount.CurrencyCode);
        Assert.Equal("XAF", (await db.Invoices.SingleAsync()).CurrencyCode);
    }

    [Fact]
    public async Task The_line_label_shows_the_arithmetic_behind_the_charge()
    {
        // ACC-06: basis, volume and weight, so the customer can recalculate.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, 550_000m));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        var label = (await db.InvoiceLines.SingleAsync()).Label;
        Assert.Contains("CBM", label);
        Assert.Contains("2", label);
        Assert.Contains("285", label);
    }

    [Fact]
    public async Task Tax_fields_exist_and_resolve_to_zero_for_now()
    {
        // ACC-16: modelled now, applied once Finance decides.
        var (db, id) = await ContainerAsync();
        await using var _ = db;
        db.Packages.Add(Cargo(id, 1, 550_000m));
        await db.SaveChangesAsync();

        await Service(db).GenerateForShipmentAsync(id, 1);

        var invoice = await db.Invoices.SingleAsync();
        Assert.Equal(550_000m, invoice.UntaxedTotal);
        Assert.Equal(0m, invoice.TaxTotal);
        Assert.Equal(invoice.UntaxedTotal + invoice.TaxTotal, invoice.GrandTotal);
    }
}
