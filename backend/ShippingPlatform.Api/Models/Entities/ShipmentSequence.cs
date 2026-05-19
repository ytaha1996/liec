using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class ShipmentSequence
{
    public int Id { get; set; }
    [MaxLength(3)] public string OriginWarehouseCode { get; set; } = string.Empty;
    public int Year { get; set; }
    public int LastNumber { get; set; }
}
