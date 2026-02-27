namespace ShippingPlatform.Api.Models;

public class PackageItem
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public int GoodTypeId { get; set; }
    public GoodType GoodType { get; set; } = null!;
    public decimal WeightKg { get; set; }
    public decimal VolumeM3 { get; set; }
    public decimal LineCharge { get; set; }
}
