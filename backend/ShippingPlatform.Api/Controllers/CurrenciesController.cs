using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/currencies")]
public class CurrenciesController(ICurrencyBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<CurrencyDto>>> List() => Ok(await business.ListAsync());

    [HttpGet("{code}")]
    public async Task<ActionResult<CurrencyDto>> Get(string code) =>
        (await business.GetAsync(code.ToUpperInvariant())) is { } dto ? Ok(dto) : NotFound();

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertCurrencyRequest req)
    {
        var (dto, err) = await business.CreateAsync(req);
        if (err is not null) return Conflict(err);
        return Created($"/api/currencies/{dto!.Code}", dto);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{code}")]
    public async Task<IActionResult> Update(string code, UpsertCurrencyRequest req)
    {
        var (dto, err) = await business.UpdateAsync(code.ToUpperInvariant(), req);
        if (err is not null) return Conflict(err);
        return dto is null ? NotFound() : Ok(dto);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code)
    {
        var err = await business.DeleteAsync(code.ToUpperInvariant());
        if (err is null) return NotFound();
        if (err.GetType().GetProperty("code") is not null) return Conflict(err);
        return NoContent();
    }
}
