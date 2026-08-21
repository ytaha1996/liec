using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Currency
{
    public int Id { get; set; }
    [MaxLength(3)] public string Code { get; set; } = string.Empty;
    [MaxLength(60)] public string Name { get; set; } = string.Empty;
    [MaxLength(8)] public string? Symbol { get; set; }
    public bool IsBase { get; set; }
    [MaxLength(3)] public string? AnchorCurrencyCode { get; set; }
    public decimal? Rate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
