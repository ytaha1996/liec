using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/lookups")]
public class LookupsController(ICurrencyBusiness currencies) : ControllerBase
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

    [HttpGet("currencies")]
    public async Task<ActionResult<IEnumerable<LookupItemDto>>> Currencies()
    {
        var list = await currencies.ListAsync();
        return Ok(list
            .Where(c => c.IsActive)
            .OrderBy(c => c.Code)
            .Select((c, i) => new LookupItemDto(i + 1, c.Code, $"{c.Code} — {c.Name}", $"{c.Code} — {c.Name}")));
    }
}
