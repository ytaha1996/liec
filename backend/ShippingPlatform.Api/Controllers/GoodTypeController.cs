using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/good-types")]
public class GoodTypeController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<GoodTypeDto>>> List() => Ok((await db.GoodTypes.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<GoodTypeDto>> Get(int id) => await db.GoodTypes.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<GoodTypeDto>> Create(UpsertGoodTypeRequest req) { var e = new GoodType { NameEn=req.NameEn, NameAr=req.NameAr, RatePerKg=req.RatePerKg, RatePerM3=req.RatePerM3, IsActive=req.IsActive }; db.GoodTypes.Add(e); await db.SaveChangesAsync(); return Created($"/api/good-types/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<GoodTypeDto>> Update(int id, UpsertGoodTypeRequest req) { var e=await db.GoodTypes.FindAsync(id); if(e is null) return NotFound(); e.NameEn=req.NameEn; e.NameAr=req.NameAr; e.RatePerKg=req.RatePerKg; e.RatePerM3=req.RatePerM3; e.IsActive=req.IsActive; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
}
