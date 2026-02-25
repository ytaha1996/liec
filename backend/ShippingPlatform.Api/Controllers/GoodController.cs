using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/goods")]
public class GoodController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<Good>>> List() => Ok(await db.Goods.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<Good>> Get(int id) => await db.Goods.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<Good>> Create(Good entity) { db.Goods.Add(entity); await db.SaveChangesAsync(); return Created($"/api/goods/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<Good>> Update(int id, Good input) { var e=await db.Goods.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
}
