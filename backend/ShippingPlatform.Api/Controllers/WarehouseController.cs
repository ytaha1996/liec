using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/warehouses")]
public class WarehouseController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<Warehouse>>> List() => Ok(await db.Warehouses.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<Warehouse>> Get(int id) => await db.Warehouses.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<Warehouse>> Create(Warehouse entity) { db.Warehouses.Add(entity); await db.SaveChangesAsync(); return Created($"/api/warehouses/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<Warehouse>> Update(int id, Warehouse input) { var e=await db.Warehouses.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
}
