using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/supply-orders")]
public class SupplyOrderController(ISupplyOrderBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<SupplyOrderDto>>> List() => Ok(await business.ListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<SupplyOrderDto>> Get(int id) => (await business.GetAsync(id)) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<SupplyOrderDto>> Create(UpsertSupplyOrderRequest req) { var e = await business.CreateAsync(req); return Created($"/api/supply-orders/{e.Id}", e); }
    [HttpPut("{id:int}")] public async Task<ActionResult<SupplyOrderDto>> Update(int id, UpsertSupplyOrderRequest req) => (await business.UpdateAsync(id, req)) is { } e ? Ok(e) : NotFound();

    [HttpPost("{id:int}/transition")]
    public async Task<IActionResult> Transition(int id, SupplyOrderTransitionRequest req)
    {
        var (dto, err) = await business.TransitionAsync(id, req);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
