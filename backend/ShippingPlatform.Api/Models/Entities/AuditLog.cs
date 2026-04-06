using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class AuditLog
{
    public long Id { get; set; }
    [MaxLength(50)] public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    [MaxLength(50)] public string Action { get; set; } = string.Empty;
    [MaxLength(2000)] public string? OldValue { get; set; }
    [MaxLength(2000)] public string? NewValue { get; set; }
    public int? AdminUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
