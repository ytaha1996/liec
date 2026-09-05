using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// A throwaway in-memory database per test, plus the small amount of reference
/// data most tests need. Each call gets its own database name so tests never
/// see each other's rows.
/// </summary>
public static class TestDb
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"test-{Guid.NewGuid()}")
            // The in-memory provider has no transactions; the production code
            // opens them, and warning-as-error would fail every such test.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>The XAF tariff the business actually runs on: 275,000/m³, 500/kg, 120,000 minimum.</summary>
    public static PricingConfig RealTariff(decimal minimumCharge = 120_000m) => new()
    {
        Name = "Standard XAF Rate",
        Currency = "XAF",
        EffectiveFrom = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        DefaultRatePerKg = 500m,
        DefaultRatePerCbm = 275_000m,
        MinimumCharge = minimumCharge,
        Status = PricingConfigStatus.Active,
    };

    public static async Task<AppDbContext> WithTariffAsync(decimal minimumCharge = 120_000m)
    {
        var db = Create();
        db.PricingConfigs.Add(RealTariff(minimumCharge));
        await db.SaveChangesAsync();
        return db;
    }

    public static Package Package(decimal weightKg, decimal cbm, PackageStatus status = PackageStatus.Draft) => new()
    {
        WeightKg = weightKg,
        Cbm = cbm,
        Status = status,
    };
}
