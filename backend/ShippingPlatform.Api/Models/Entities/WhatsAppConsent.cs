using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class WhatsAppConsent
{
    [Key] public int CustomerId { get; set; }
    public bool OptInStatusUpdates { get; set; } = true;
    public bool OptInDeparturePhotos { get; set; } = true;
    public bool OptInArrivalPhotos { get; set; } = true;
    public DateTime? OptedOutAt { get; set; }
    public Customer Customer { get; set; } = null!;
}
