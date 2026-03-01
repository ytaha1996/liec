namespace ShippingPlatform.Api.Models;

public class GoodType
{
    public int Id { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public bool CanBreak { get; set; }
    public bool CanBurn { get; set; }
    public bool IsActive { get; set; } = true;
}
