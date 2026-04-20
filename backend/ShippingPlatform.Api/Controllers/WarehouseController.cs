using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/warehouses")]
public class WarehouseController(IMasterDataBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<WarehouseDto>>> List() => Ok(await business.ListWarehousesAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<WarehouseDto>> Get(int id) => (await business.GetWarehouseAsync(id)) is { } e ? Ok(e) : NotFound();
    [Authorize(Roles = "Admin,Manager")] [HttpPost] public async Task<ActionResult<WarehouseDto>> Create(UpsertWarehouseRequest req) { var e = await business.CreateWarehouseAsync(req); return Created($"/api/warehouses/{e.Id}", e); }
    [Authorize(Roles = "Admin,Manager")] [HttpPut("{id:int}")] public async Task<ActionResult<WarehouseDto>> Update(int id, UpsertWarehouseRequest req) => (await business.UpdateWarehouseAsync(id, req)) is { } e ? Ok(e) : NotFound();
}
