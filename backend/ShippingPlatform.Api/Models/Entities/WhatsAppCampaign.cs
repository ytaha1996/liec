namespace ShippingPlatform.Api.Models;

public class WhatsAppCampaign
{
    public int Id { get; set; }
    public CampaignType Type { get; set; }
    public int ShipmentId { get; set; }
    public int TriggeredByAdminUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int RecipientCount { get; set; }
    public bool Completed { get; set; }
    public List<WhatsAppDeliveryLog> DeliveryLogs { get; set; } = [];
}
