namespace ShippingPlatform.Api.Models;

public class WhatsAppDeliveryLog
{
    public int Id { get; set; }
    public int CampaignId { get; set; }
    public WhatsAppCampaign Campaign { get; set; } = null!;
    public int CustomerId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public DeliveryResult Result { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? SentAt { get; set; }
}
