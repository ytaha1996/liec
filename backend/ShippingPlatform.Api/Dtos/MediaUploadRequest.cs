using Microsoft.AspNetCore.Http;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

public class MediaUploadRequest
{
    public MediaStage Stage { get; set; }
    public DateTime? CapturedAt { get; set; }
    public string? OperatorName { get; set; }
    public string? Notes { get; set; }
    public IFormFile? File { get; set; }
}
