using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Warehouse
{
    public int Id { get; set; }
    [MaxLength(3)] public string Code { get; set; } = string.Empty;
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal MaxWeightKg { get; set; }
    public decimal MaxVolumeM3 { get; set; }
    public bool IsActive { get; set; } = true;
}
