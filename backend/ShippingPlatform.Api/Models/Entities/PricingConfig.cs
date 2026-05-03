using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class PricingConfig
{
    public int Id { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(3)] public string Currency { get; set; } = "EUR";
    public Currency? CurrencyEntity { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public decimal DefaultRatePerKg { get; set; }
    public decimal DefaultRatePerCbm { get; set; }
    public decimal MinimumCharge { get; set; }
    public PricingConfigStatus Status { get; set; } = PricingConfigStatus.Draft;
}
