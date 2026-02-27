using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Shipment
{
    public int Id { get; set; }
    public string RefCode { get; set; } = string.Empty;
    [MaxLength(4)] public string? TiiuCode { get; set; }
    public int OriginWarehouseId { get; set; }
    public int DestinationWarehouseId { get; set; }
    public Warehouse OriginWarehouse { get; set; } = null!;
    public Warehouse DestinationWarehouse { get; set; } = null!;
    public DateTime PlannedDepartureDate { get; set; }
    public DateTime PlannedArrivalDate { get; set; }
    public DateTime? ActualDepartureAt { get; set; }
    public DateTime? ActualArrivalAt { get; set; }
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Draft;
    public decimal MaxWeightKg { get; set; } = 0;
    public decimal MaxVolumeM3 { get; set; } = 0;
    public decimal TotalWeightKg { get; set; }
    public decimal TotalVolumeM3 { get; set; }
    public string? ExternalTrackingCode { get; set; }
    public string? ExternalCarrierName { get; set; }
    public string? ExternalOrigin { get; set; }
    public string? ExternalDestination { get; set; }
    public DateTime? ExternalEstimatedArrivalAt { get; set; }
    public string? ExternalStatus { get; set; }
    public DateTime? ExternalLastSyncedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Package> Packages { get; set; } = [];
}
