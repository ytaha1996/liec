using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class PackageDocument
{
    public int Id { get; set; }
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    [MaxLength(200)] public string FileName { get; set; } = string.Empty;
    [MaxLength(500)] public string BlobKey { get; set; } = string.Empty;
    [MaxLength(500)] public string PublicUrl { get; set; } = string.Empty;
    [MaxLength(120)] public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    public int? UploadedByAdminUserId { get; set; }
    public AdminUser? UploadedByAdminUser { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
