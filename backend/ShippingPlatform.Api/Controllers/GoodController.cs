using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/goods")]
public class GoodController(IMasterDataBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<GoodDto>>> List() => Ok(await business.ListGoodsAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<GoodDto>> Get(int id) => (await business.GetGoodAsync(id)) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<GoodDto>> Create(UpsertGoodRequest req) { var e = await business.CreateGoodAsync(req); return Created($"/api/goods/{e.Id}", e); }
    [HttpPut("{id:int}")] public async Task<ActionResult<GoodDto>> Update(int id, UpsertGoodRequest req) => (await business.UpdateGoodAsync(id, req)) is { } e ? Ok(e) : NotFound();
}
