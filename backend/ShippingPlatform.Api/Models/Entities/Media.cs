namespace ShippingPlatform.Api.Models;

public class Media
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public MediaStage Stage { get; set; }
    public string BlobKey { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? CapturedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int RecordedByAdminUserId { get; set; }
    public string? OperatorName { get; set; }
}
