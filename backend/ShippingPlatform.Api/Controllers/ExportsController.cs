using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/exports")]
public class ExportsController(IExportBusiness business) : ControllerBase
{
    [HttpPost("group-helper")]
    public async Task<IActionResult> GroupHelper(ExportRequest req) => Ok(await business.GroupHelperAsync(req.Format));
}
