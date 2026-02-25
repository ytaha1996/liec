using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/good-types")]
public class GoodTypeController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<GoodType>>> List() => Ok(await db.GoodTypes.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<GoodType>> Get(int id) => await db.GoodTypes.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<GoodType>> Create(GoodType entity) { db.GoodTypes.Add(entity); await db.SaveChangesAsync(); return Created($"/api/good-types/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<GoodType>> Update(int id, GoodType input) { var e=await db.GoodTypes.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
}
