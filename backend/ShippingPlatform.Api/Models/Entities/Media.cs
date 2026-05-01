using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class Media
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public MediaStage Stage { get; set; }
    [MaxLength(500)] public string BlobKey { get; set; } = string.Empty;
    [MaxLength(500)] public string PublicUrl { get; set; } = string.Empty;
    [MaxLength(1000)] public string? Notes { get; set; }
    public DateTime? CapturedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int? RecordedByAdminUserId { get; set; }
    public AdminUser? RecordedByAdminUser { get; set; }
    [MaxLength(200)] public string? OperatorName { get; set; }
}
