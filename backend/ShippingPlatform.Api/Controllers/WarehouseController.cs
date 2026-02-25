using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/warehouses")]
public class WarehouseController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<WarehouseDto>>> List() => Ok((await db.Warehouses.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<WarehouseDto>> Get(int id) => await db.Warehouses.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<WarehouseDto>> Create(UpsertWarehouseRequest req) { var e = new Warehouse { Code=req.Code, Name=req.Name, City=req.City, Country=req.Country, MaxWeightKg=req.MaxWeightKg, MaxVolumeM3=req.MaxVolumeM3, IsActive=req.IsActive }; db.Warehouses.Add(e); await db.SaveChangesAsync(); return Created($"/api/warehouses/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<WarehouseDto>> Update(int id, UpsertWarehouseRequest req) { var e=await db.Warehouses.FindAsync(id); if(e is null) return NotFound(); e.Code=req.Code; e.Name=req.Name; e.City=req.City; e.Country=req.Country; e.MaxWeightKg=req.MaxWeightKg; e.MaxVolumeM3=req.MaxVolumeM3; e.IsActive=req.IsActive; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
}
