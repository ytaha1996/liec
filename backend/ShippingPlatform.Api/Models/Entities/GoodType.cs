using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class GoodType
{
    public int Id { get; set; }
    [MaxLength(200)] public string NameEn { get; set; } = string.Empty;
    [MaxLength(200)] public string NameAr { get; set; } = string.Empty;
    public bool CanBreak { get; set; }
    public bool CanBurn { get; set; }
    public bool IsActive { get; set; } = true;
}
