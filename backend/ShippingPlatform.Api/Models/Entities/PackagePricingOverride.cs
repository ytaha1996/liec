using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class PackagePricingOverride
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public PricingOverrideType OverrideType { get; set; }
    public decimal OriginalValue { get; set; }
    public decimal NewValue { get; set; }
    [MaxLength(500)] public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int AdminUserId { get; set; }
}
