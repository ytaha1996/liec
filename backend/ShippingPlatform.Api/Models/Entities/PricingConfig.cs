namespace ShippingPlatform.Api.Models;

public class PricingConfig
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = "EUR";
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public decimal DefaultRatePerKg { get; set; }
    public decimal DefaultRatePerCbm { get; set; }
    public PricingConfigStatus Status { get; set; } = PricingConfigStatus.Draft;
}
