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
    /// <summary>
    /// ACC-01: what the goods are worth, read by customs — never the freight,
    /// and never defaulted from it. Held in USD because that is what the
    /// Gabonese customs process expects; the currency is stored explicitly so
    /// no document can print it under the wrong heading (ACC-14).
    /// </summary>
    public Money? DeclaredValue { get; set; }

    /// <summary>ACC-01: customs tariff (HS) code. Defaults from the good type.</summary>
    [MaxLength(20)] public string? HsCode { get; set; }

    [MaxLength(500)] public string? Note { get; set; }
}
