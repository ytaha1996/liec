using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Package
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public ProvisionMethod ProvisionMethod { get; set; } = ProvisionMethod.CustomerProvided;
    public PackageStatus Status { get; set; } = PackageStatus.Draft;
    public decimal WeightKg { get; set; }
    public decimal Cbm { get; set; }
    [MaxLength(3)] public string Currency { get; set; } = "EUR";
    public Currency? CurrencyEntity { get; set; }
    public decimal AppliedRatePerKg { get; set; }
    public decimal AppliedRatePerCbm { get; set; }
    public decimal ChargeAmount { get; set; }
    public bool HasDeparturePhotos { get; set; }
    public bool HasArrivalPhotos { get; set; }
    public bool HasPricingOverride { get; set; }

    // Which side of the tariff set ChargeAmount (volume, weight, the configured
    // minimum, or a negotiated total). Stamped by PricingService and the override
    // path so exports and reports agree without recomputing.
    public PriceBasis PriceBasis { get; set; } = PriceBasis.Unknown;

    // Adjustments on top of the freight, mirroring the FEES column on the real
    // BOL. Kept apart from ChargeAmount so a pricing recalc never wipes them and
    // the freight/fee split survives into the invoice. Both are non-negative;
    // the net (ChargeAmount + Fee - Discount) is derived, never stored.
    public decimal FeeAmount { get; set; }
    [MaxLength(500)] public string? FeeReason { get; set; }
    public decimal DiscountAmount { get; set; }
    [MaxLength(500)] public string? DiscountReason { get; set; }
    public int? SupplyOrderId { get; set; }
    [MaxLength(1000)] public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Children. Setters are private so the reference can't be reassigned externally; .Add() is
    // still possible via the navigation but in practice mutations go through the DbSets
    // (db.PackageItems.Add(...), db.Media.Add(...), etc.). A full IReadOnlyList projection
    // requires a deeper EF Core configuration that we deferred — see gap #18.
    public List<PackageItem> Items { get; private set; } = [];
    public List<Media> Media { get; private set; } = [];
    public List<PackagePricingOverride> PricingOverrides { get; private set; } = [];
}
