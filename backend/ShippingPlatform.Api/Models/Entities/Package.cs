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
    public decimal TotalWeightKg { get; set; }
    public decimal TotalVolumeM3 { get; set; }
    public string Currency { get; set; } = "EUR";
    public decimal AppliedRatePerKg { get; set; }
    public decimal AppliedRatePerM3 { get; set; }
    public decimal ChargeAmount { get; set; }
    public bool HasDeparturePhotos { get; set; }
    public bool HasArrivalPhotos { get; set; }
    public bool HasPricingOverride { get; set; }
    public int? SupplyOrderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<PackageItem> Items { get; set; } = [];
    public List<Media> Media { get; set; } = [];
    public List<PackagePricingOverride> PricingOverrides { get; set; } = [];
}
