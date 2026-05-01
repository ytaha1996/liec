using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/lookups")]
public class LookupsController : ControllerBase
{
    [HttpGet("units")]
    public ActionResult<IEnumerable<LookupItemDto>> Units() =>
        Ok(Enum.GetValues<Unit>()
            .OrderBy(u => (int)u)
            .Select(u => new LookupItemDto(
                (int)u,
                u.ToString(),
                UnitLabels.En[u],
                UnitLabels.Ar[u])));
}
