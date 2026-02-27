using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class PackageItem
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public int GoodTypeId { get; set; }
    public GoodType GoodType { get; set; } = null!;
    public int Quantity { get; set; } = 1;
    [MaxLength(500)] public string? Note { get; set; }
}
