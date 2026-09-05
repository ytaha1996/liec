using Microsoft.AspNetCore.Http;

namespace ShippingPlatform.Api.Dtos;

public class DocumentUploadRequest
{
    public IFormFile? File { get; set; }
    public string? Notes { get; set; }
    // Set by controller from JWT claims, not from form. Null if the claim is missing.
    public int? AdminUserId { get; set; }
}
