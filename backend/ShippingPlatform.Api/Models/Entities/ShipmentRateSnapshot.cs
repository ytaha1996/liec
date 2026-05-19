using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class ShipmentRateSnapshot
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
    public ShipmentSnapshotEvent Event { get; set; }
    [MaxLength(3)] public string CurrencyCode { get; set; } = string.Empty;
    public decimal RateToBase { get; set; }
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
}
