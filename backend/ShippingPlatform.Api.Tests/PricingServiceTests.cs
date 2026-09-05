using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// The freight calculation, tested against the real 925 tariff and the real
/// figures from that container's Bill of Lading. This logic decides what every
/// customer pays and had no tests until now — the weight-first bug that shipped
/// to production would have been caught by the first case below.
/// </summary>
public class PricingServiceTests
{
    private static async Task<Package> PriceAsync(decimal weightKg, decimal cbm, decimal minimumCharge = 120_000m)
    {
        await using var db = await TestDb.WithTariffAsync(minimumCharge);
        var package = TestDb.Package(weightKg, cbm);
        await new PricingService(db).RecalculateAsync(package);
        return package;
    }

    [Fact]
    public async Task Charges_the_volume_side_when_it_is_worth_more()
    {
        // ALI FARHAT, order form 1: 2 m³ / 285 kg → 550,000 on the real BOL.
        var p = await PriceAsync(weightKg: 285m, cbm: 2m);

        Assert.Equal(550_000m, p.ChargeAmount);
        Assert.Equal(PriceBasis.Cbm, p.PriceBasis);
    }

    [Fact]
    public async Task Charges_the_weight_side_when_it_is_worth_more()
    {
        // GHASSAN GHANDOUR, order form 13: 0.75 m³ / 625 kg → 312,500.
        var p = await PriceAsync(weightKg: 625m, cbm: 0.75m);

        Assert.Equal(312_500m, p.ChargeAmount);
        Assert.Equal(PriceBasis.Weight, p.PriceBasis);
    }

    [Fact]
    public async Task Applies_the_minimum_charge_to_small_cargo()
    {
        // HASSAN AWDE, order form 16: 0.13 m³ / 74 kg → the 120,000 minimum.
        var p = await PriceAsync(weightKg: 74m, cbm: 0.13m);

        Assert.Equal(120_000m, p.ChargeAmount);
        Assert.Equal(PriceBasis.Minimum, p.PriceBasis);
    }

    [Fact]
    public async Task Without_a_configured_minimum_small_cargo_pays_the_tariff()
    {
        var p = await PriceAsync(weightKg: 74m, cbm: 0.13m, minimumCharge: 0m);

        Assert.Equal(37_000m, p.ChargeAmount); // 74 kg beats 0.13 m³
        Assert.Equal(PriceBasis.Weight, p.PriceBasis);
    }

    [Fact]
    public async Task Stamps_rates_and_currency_even_when_nothing_is_charged()
    {
        // A package recorded on arrival before it has been measured: it must
        // still carry the tariff so exports never show a default currency.
        var p = await PriceAsync(weightKg: 0m, cbm: 0m);

        Assert.Equal(0m, p.ChargeAmount);
        Assert.Equal("XAF", p.Currency);
        Assert.Equal(500m, p.AppliedRatePerKg);
        Assert.Equal(275_000m, p.AppliedRatePerCbm);
        Assert.Equal(PriceBasis.Unknown, p.PriceBasis);
    }

    [Fact]
    public async Task Never_recalculates_a_negotiated_price()
    {
        // ACC-12: a later recalculation must not silently overwrite an override.
        await using var db = await TestDb.WithTariffAsync();
        var package = TestDb.Package(weightKg: 285m, cbm: 2m);
        package.ChargeAmount = 1m;
        package.HasPricingOverride = true;

        await new PricingService(db).RecalculateAsync(package);

        Assert.Equal(1m, package.ChargeAmount);
    }

    [Theory]
    [InlineData(PackageStatus.ArrivedAtDestination)]
    [InlineData(PackageStatus.ReadyForHandout)]
    [InlineData(PackageStatus.HandedOut)]
    public async Task Freezes_the_price_once_the_goods_have_arrived(PackageStatus status)
    {
        // Committed for customs and invoicing; changes go through an override.
        await using var db = await TestDb.WithTariffAsync();
        var package = TestDb.Package(weightKg: 285m, cbm: 2m, status: status);
        package.ChargeAmount = 999m;

        await new PricingService(db).RecalculateAsync(package);

        Assert.Equal(999m, package.ChargeAmount);
    }

    [Fact]
    public async Task Still_prices_a_package_that_is_in_transit()
    {
        await using var db = await TestDb.WithTariffAsync();
        var package = TestDb.Package(weightKg: 285m, cbm: 2m, status: PackageStatus.Shipped);

        await new PricingService(db).RecalculateAsync(package);

        Assert.Equal(550_000m, package.ChargeAmount);
    }
}
