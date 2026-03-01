using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Customer
{
    public int Id { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
    [MaxLength(200)] public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public WhatsAppConsent? WhatsAppConsent { get; set; }
}
