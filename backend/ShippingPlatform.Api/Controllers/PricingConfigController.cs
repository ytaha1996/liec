using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/pricing-configs")]
[Authorize(Roles = "Admin,Manager,Accountant")]
public class PricingConfigController(IMasterDataBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<PricingConfigDto>>> List() => Ok(await business.ListPricingConfigsAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<PricingConfigDto>> Get(int id) => (await business.GetPricingConfigAsync(id)) is { } e ? Ok(e) : NotFound();
    // Writes are Admin/Manager only — pricing configs drive every charge; Accountant keeps read access via the class attribute.
    [HttpPost, Authorize(Roles = "Admin,Manager")] public async Task<ActionResult<PricingConfigDto>> Create(UpsertPricingConfigRequest req) { var e = await business.CreatePricingConfigAsync(req); return Created($"/api/pricing-configs/{e.Id}", e); }
    [HttpPut("{id:int}"), Authorize(Roles = "Admin,Manager")] public async Task<ActionResult<PricingConfigDto>> Update(int id, UpsertPricingConfigRequest req) => (await business.UpdatePricingConfigAsync(id, req)) is { } e ? Ok(e) : NotFound();
    [HttpPost("{id:int}/activate"), Authorize(Roles = "Admin,Manager")] public async Task<IActionResult> Activate(int id) => (await business.ActivatePricingConfigAsync(id)) is { } e ? Ok(e) : NotFound();
    [HttpPost("{id:int}/retire"), Authorize(Roles = "Admin,Manager")] public async Task<IActionResult> Retire(int id) => (await business.RetirePricingConfigAsync(id)) is { } e ? Ok(e) : NotFound();
}
