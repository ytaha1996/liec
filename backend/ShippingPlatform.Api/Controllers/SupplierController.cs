using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SupplierController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<Supplier>>> List() => Ok(await db.Suppliers.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<Supplier>> Get(int id) => await db.Suppliers.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<Supplier>> Create(Supplier entity) { db.Suppliers.Add(entity); await db.SaveChangesAsync(); return Created($"/api/suppliers/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<Supplier>> Update(int id, Supplier input) { var e=await db.Suppliers.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
}
