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
    public int? SupplyOrderId { get; set; }
    [MaxLength(1000)] public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Children populated by EF via the backing fields below. Exposed as readonly
    // projections so consumers cannot mutate the lists; modifications go through
    // the corresponding DbSet (db.PackageItems.Add(...), db.Media.Add(...), etc.).
    private readonly List<PackageItem> _items = new();
    public IReadOnlyList<PackageItem> Items => _items;
    private readonly List<Media> _media = new();
    public IReadOnlyList<Media> Media => _media;
    private readonly List<PackagePricingOverride> _pricingOverrides = new();
    public IReadOnlyList<PackagePricingOverride> PricingOverrides => _pricingOverrides;
}
