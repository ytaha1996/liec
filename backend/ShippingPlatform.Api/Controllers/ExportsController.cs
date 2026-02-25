using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/exports")]
public class ExportsController(IExportService exports) : ControllerBase
{
    [HttpPost("group-helper")]
    public async Task<IActionResult> GroupHelper(ExportRequest req)
    {
        var url = await exports.GenerateGroupHelperAsync(req.Format);
        return Ok(new { publicUrl = url, warning = "WhatsApp groups reveal phone numbers to all members." });
    }
}
