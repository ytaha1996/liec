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
    public Unit Unit { get; set; } = Unit.Box;
    public decimal? UnitPrice { get; set; }
    // Currency the operator entered the unit price in. Defaults to USD (the
    // historical assumption + the system base currency). Storage stays in
    // this currency; conversion to the active PricingConfig.Currency happens
    // at display time via IPriceConverter.
    [MaxLength(3)] public string UnitPriceCurrency { get; set; } = "USD";
    [MaxLength(500)] public string? Note { get; set; }
}
