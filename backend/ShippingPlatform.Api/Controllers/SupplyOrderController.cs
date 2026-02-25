using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/supply-orders")]
public class SupplyOrderController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<SupplyOrder>>> List() => Ok(await db.SupplyOrders.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<SupplyOrder>> Get(int id) => await db.SupplyOrders.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<SupplyOrder>> Create(SupplyOrder entity) { db.SupplyOrders.Add(entity); await db.SaveChangesAsync(); return Created($"/api/supply-orders/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<SupplyOrder>> Update(int id, SupplyOrder input) { var e=await db.SupplyOrders.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
}
