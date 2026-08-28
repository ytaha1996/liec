using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

/// <summary>
/// One definition of "what set this package's freight", shared by the pricing
/// service, the BOL/invoice exports and the reports endpoint so the four
/// surfaces can never disagree.
/// </summary>
public static class PriceBasisHelper
{
    /// <summary>
    /// Derives the basis from a package's frozen rates and charge. Used when
    /// stamping a fresh calculation and to backfill rows written before the
    /// column existed.
    /// </summary>
    public static PriceBasis Resolve(Package p)
    {
        // A negotiated total answers the question on its own — the rates no
        // longer explain the charge.
        if (p.HasPricingOverride) return PriceBasis.Custom;
        if (p.WeightKg <= 0 && p.Cbm <= 0) return PriceBasis.Unknown;

        var byWeight = p.WeightKg * p.AppliedRatePerKg;
        var byVolume = p.Cbm * p.AppliedRatePerCbm;

        // Charged above both sides of the tariff: the configured minimum won.
        if (p.ChargeAmount > byWeight && p.ChargeAmount > byVolume) return PriceBasis.Minimum;

        return byWeight >= byVolume ? PriceBasis.Weight : PriceBasis.Cbm;
    }

    public static string Label(PriceBasis basis) => basis switch
    {
        PriceBasis.Cbm => "CBM",
        PriceBasis.Weight => "Weight",
        PriceBasis.Minimum => "Minimum",
        PriceBasis.Custom => "Custom",
        _ => "—",
    };

    /// <summary>
    /// The basis for a set of packages billed as one line (the BOL groups by
    /// customer, and one customer can hold several packages). Reports "Mixed"
    /// rather than picking a winner when they disagree.
    /// </summary>
    public static string GroupLabel(IEnumerable<Package> packages)
    {
        var distinct = packages.Select(p => p.PriceBasis).Distinct().ToList();
        if (distinct.Count == 0) return "—";
        return distinct.Count == 1 ? Label(distinct[0]) : "Mixed";
    }
}
