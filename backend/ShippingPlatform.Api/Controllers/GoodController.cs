using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/goods")]
public class GoodController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<GoodDto>>> List() => Ok((await db.Goods.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<GoodDto>> Get(int id) => await db.Goods.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<GoodDto>> Create(UpsertGoodRequest req) { var e = new Good { GoodTypeId=req.GoodTypeId, NameEn=req.NameEn, NameAr=req.NameAr, CanBurn=req.CanBurn, CanBreak=req.CanBreak, Unit=req.Unit, RatePerKgOverride=req.RatePerKgOverride, RatePerM3Override=req.RatePerM3Override, IsActive=req.IsActive }; db.Goods.Add(e); await db.SaveChangesAsync(); return Created($"/api/goods/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<GoodDto>> Update(int id, UpsertGoodRequest req) { var e=await db.Goods.FindAsync(id); if(e is null) return NotFound(); e.GoodTypeId=req.GoodTypeId; e.NameEn=req.NameEn; e.NameAr=req.NameAr; e.CanBurn=req.CanBurn; e.CanBreak=req.CanBreak; e.Unit=req.Unit; e.RatePerKgOverride=req.RatePerKgOverride; e.RatePerM3Override=req.RatePerM3Override; e.IsActive=req.IsActive; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
}
