using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Customer
{
    public int Id { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
    [MaxLength(200)] public string? Email { get; set; }
    [MaxLength(300)] public string? CompanyName { get; set; }
    [MaxLength(50)] public string? TaxId { get; set; }
    [MaxLength(500)] public string? BillingAddress { get; set; }
    public bool IsActive { get; set; } = true;
    public WhatsAppConsent? WhatsAppConsent { get; set; }
}
