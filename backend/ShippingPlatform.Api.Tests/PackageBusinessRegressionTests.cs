using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using Xunit;

namespace ShippingPlatform.Api.Tests;

public class PackageBusinessRegressionTests
{
    private static AppDbContext CreateDb()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new AppDbContext(opts);
        db.Warehouses.AddRange(new Warehouse { Id = 1, Code = "BEI", Name = "A", City = "A", Country = "A" }, new Warehouse { Id = 2, Code = "DXB", Name = "B", City = "B", Country = "B" });
        db.Customers.Add(new Customer { Id = 1, Name = "C", PrimaryPhone = "+1" });
        db.GoodTypes.Add(new GoodType { Id = 1, NameEn = "T", NameAr = "T", RatePerKg = 5, RatePerM3 = 9 });
        db.Goods.Add(new Good { Id = 1, GoodTypeId = 1, NameEn = "G", NameAr = "G", RatePerKgOverride = 10, RatePerM3Override = 12 });
        db.PricingConfigs.Add(new PricingConfig { Id = 1, Name = "Active", Status = PricingConfigStatus.Active, Currency = "EUR", EffectiveFrom = DateTime.UtcNow, DefaultRatePerKg = 2, DefaultRatePerM3 = 3 });
        db.Shipments.Add(new Shipment { Id = 1, RefCode = "BEI-2601", OriginWarehouseId = 1, DestinationWarehouseId = 2, PlannedDepartureDate = DateTime.UtcNow, PlannedArrivalDate = DateTime.UtcNow.AddDays(2), Status = ShipmentStatus.Draft });
        db.Containers.Add(new Container { Id = 1, ShipmentId = 1, Code = "BEI-2601-C01" });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Auto_Assigns_Default_Container_On_Create()
    {
        await using var db = CreateDb();
        var business = new PackageBusiness(db, new PricingService(db), new PhotoComplianceService(db), new BlobStorageService(new ConfigurationBuilder().Build()), new ConfigurationBuilder().Build(), new TransitionRuleService());

        var created = await business.CreateAsync(1, new CreatePackageRequest(1, ProvisionMethod.CustomerProvided, null, null));

        Assert.NotNull(created);
        Assert.Equal(1, created!.ContainerId);
    }

    [Fact]
    public async Task Pricing_Override_Discount_And_Fees_Are_Applied()
    {
        await using var db = CreateDb();
        var business = new PackageBusiness(db, new PricingService(db), new PhotoComplianceService(db), new BlobStorageService(new ConfigurationBuilder().Build()), new ConfigurationBuilder().Build(), new TransitionRuleService());
        var created = await business.CreateAsync(1, new CreatePackageRequest(1, ProvisionMethod.CustomerProvided, null, null));
        Assert.NotNull(created);

        await business.AddItemAsync(created!.Id, new UpsertPackageItemRequest(1, 2, 3, 1));
        await business.UpdateMetadataAsync(created.Id, new PackageMetadataUpdateRequest(null, null, 11, 13, 10));
        await business.AddFeeAsync(created.Id, new UpsertPackageFeeRequest("Handling", 7));
        var dto = (await db.Packages.FindAsync(created.Id))!;

        Assert.Equal(73m, dto.SubtotalAmount);
        Assert.Equal(72.7m, dto.ChargeAmount);
    }

    [Fact]
    public async Task Enforces_Status_Transitions_And_Vessel_Updates()
    {
        await using var db = CreateDb();
        var shipmentBusiness = new ShipmentBusiness(db, new RefCodeService(db), new PhotoComplianceService(db), new TransitionRuleService());
        var packageBusiness = new PackageBusiness(db, new PricingService(db), new PhotoComplianceService(db), new BlobStorageService(new ConfigurationBuilder().Build()), new ConfigurationBuilder().Build(), new TransitionRuleService());

        var pkg = await packageBusiness.CreateAsync(1, new CreatePackageRequest(1, ProvisionMethod.CustomerProvided, null, null));
        var invalid = await packageBusiness.ChangeStatusAsync(pkg!.Id, PackageStatus.ReadyToShip);
        Assert.NotNull(invalid.error);

        var vessel = await shipmentBusiness.UpsertVesselAsync(1, new UpsertVesselTrackingRequest("Poseidon", "VY-77", "Beirut"));
        Assert.NotNull(vessel);
        Assert.Equal("Poseidon", vessel!.VesselName);
    }
}
