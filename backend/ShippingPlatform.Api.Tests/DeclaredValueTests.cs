using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// ACC-01: declared value is what the goods are worth, kept apart from freight
/// and never invented. ACC-14: it travels with its currency.
/// </summary>
public class DeclaredValueTests
{
    private static PackageBusiness Business(Data.AppDbContext db) => new(
        db,
        new PricingService(db),
        new PhotoComplianceService(db),
        new NullBlobStorage(),
        TestConfig.Empty(),
        new TransitionRuleService(),
        new CapacityService(db, TestConfig.Empty()),
        new NullWatermark(),
        new RefCodeService(db),
        new AuditService(db));

    private static async Task<(Data.AppDbContext db, int packageId, int goodTypeId)> PackageAsync(string? defaultHs = null)
    {
        var db = await TestDb.WithTariffAsync();
        var goodType = new GoodType { NameEn = "Food Items", NameAr = "مواد غذائية", DefaultHsCode = defaultHs };
        var customer = new Customer { Name = "ABBAS HIJAZI", PrimaryPhone = "+24106644300" };
        var shipment = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.GoodTypes.Add(goodType);
        db.Customers.Add(customer);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();

        var package = new Package { ShipmentId = shipment.Id, CustomerId = customer.Id, Currency = "XAF" };
        db.Packages.Add(package);
        await db.SaveChangesAsync();
        return (db, package.Id, goodType.Id);
    }

    [Fact]
    public async Task A_declared_value_is_stored_with_its_currency()
    {
        var (db, packageId, goodTypeId) = await PackageAsync();
        await using var _ = db;

        var (dto, error) = await Business(db).AddItemAsync(packageId,
            new UpsertPackageItemRequest(goodTypeId, Quantity: 10, DeclaredValue: 120m));

        Assert.Null(error);
        Assert.Equal(120m, dto!.DeclaredValue);
        Assert.Equal("USD", dto.DeclaredValueCurrency);
    }

    [Fact]
    public async Task The_currency_can_be_stated_explicitly()
    {
        var (db, packageId, goodTypeId) = await PackageAsync();
        await using var _ = db;

        var (dto, _) = await Business(db).AddItemAsync(packageId,
            new UpsertPackageItemRequest(goodTypeId, DeclaredValue: 75_000m, DeclaredValueCurrency: "XAF"));

        Assert.Equal("XAF", dto!.DeclaredValueCurrency);
    }

    [Fact]
    public async Task An_item_with_no_declared_value_stores_none()
    {
        // Absent means absent. Nothing invents a figure for customs.
        var (db, packageId, goodTypeId) = await PackageAsync();
        await using var _ = db;

        var (dto, _) = await Business(db).AddItemAsync(packageId, new UpsertPackageItemRequest(goodTypeId));

        Assert.Null(dto!.DeclaredValue);
    }

    [Fact]
    public async Task Declared_value_is_never_taken_from_the_freight()
    {
        // The two numbers have different audiences and must not cross over.
        var (db, packageId, goodTypeId) = await PackageAsync();
        await using var _ = db;
        var package = await db.Packages.FindAsync(packageId);
        package!.ChargeAmount = 550_000m;
        await db.SaveChangesAsync();

        var (dto, _) = await Business(db).AddItemAsync(packageId, new UpsertPackageItemRequest(goodTypeId));

        Assert.Null(dto!.DeclaredValue);
    }

    [Fact]
    public async Task An_item_inherits_the_customs_code_of_its_good_type()
    {
        var (db, packageId, goodTypeId) = await PackageAsync(defaultHs: "2106.90");
        await using var _ = db;

        var (dto, _) = await Business(db).AddItemAsync(packageId, new UpsertPackageItemRequest(goodTypeId));

        Assert.Equal("2106.90", dto!.HsCode);
    }

    [Fact]
    public async Task A_stated_customs_code_overrides_the_good_type_default()
    {
        var (db, packageId, goodTypeId) = await PackageAsync(defaultHs: "2106.90");
        await using var _ = db;

        var (dto, _) = await Business(db).AddItemAsync(packageId,
            new UpsertPackageItemRequest(goodTypeId, HsCode: "0901.21"));

        Assert.Equal("0901.21", dto!.HsCode);
    }

    [Fact]
    public async Task Bulk_added_items_inherit_the_same_way()
    {
        var (db, packageId, goodTypeId) = await PackageAsync(defaultHs: "2106.90");
        await using var _ = db;

        var (dtos, _) = await Business(db).AddItemsBulkAsync(packageId,
        [
            new UpsertPackageItemRequest(goodTypeId, DeclaredValue: 12m),
            new UpsertPackageItemRequest(goodTypeId, HsCode: "0901.21"),
        ]);

        Assert.Equal("2106.90", dtos![0].HsCode);
        Assert.Equal(12m, dtos[0].DeclaredValue);
        Assert.Equal("0901.21", dtos[1].HsCode);
        Assert.Null(dtos[1].DeclaredValue);
    }

    [Fact]
    public async Task Updating_an_item_leaves_an_unmentioned_declared_value_alone()
    {
        var (db, packageId, goodTypeId) = await PackageAsync();
        await using var _ = db;
        var (created, _) = await Business(db).AddItemAsync(packageId,
            new UpsertPackageItemRequest(goodTypeId, DeclaredValue: 120m));

        var (updated, _) = await Business(db).UpdateItemAsync(packageId, created!.Id,
            new UpsertPackageItemRequest(goodTypeId, Quantity: 5));

        Assert.Equal(5, updated!.Quantity);
        Assert.Equal(120m, updated.DeclaredValue);
    }

    [Fact]
    public async Task Money_refuses_to_combine_different_currencies()
    {
        // ACC-14: mixing currencies is a bug, not an implicit conversion.
        var usd = new Money(100m, "USD");
        Assert.Throws<InvalidOperationException>(() => usd.Plus(new Money(1000m, "XAF")));
        Assert.Equal(150m, usd.Plus(new Money(50m, "USD")).Amount);
    }
}
