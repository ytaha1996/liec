using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/good-types")]
public class GoodTypeController(IMasterDataBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<GoodTypeDto>>> List() => Ok(await business.ListGoodTypesAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<GoodTypeDto>> Get(int id) => (await business.GetGoodTypeAsync(id)) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<GoodTypeDto>> Create(UpsertGoodTypeRequest req) { var e = await business.CreateGoodTypeAsync(req); return Created($"/api/good-types/{e.Id}", e); }
    [HttpPut("{id:int}")] public async Task<ActionResult<GoodTypeDto>> Update(int id, UpsertGoodTypeRequest req) => (await business.UpdateGoodTypeAsync(id, req)) is { } e ? Ok(e) : NotFound();
}
