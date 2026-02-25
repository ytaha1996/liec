using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/pricing-configs")]
public class PricingConfigController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<PricingConfig>>> List() => Ok(await db.PricingConfigs.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<PricingConfig>> Get(int id) => await db.PricingConfigs.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<PricingConfig>> Create(PricingConfig entity) { db.PricingConfigs.Add(entity); await db.SaveChangesAsync(); return Created($"/api/pricing-configs/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<PricingConfig>> Update(int id, PricingConfig input) { var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
    [HttpPost("{id:int}/activate")] public async Task<IActionResult> Activate(int id){ var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); foreach(var p in db.PricingConfigs.Where(x=>x.Status==PricingConfigStatus.Active)) p.Status=PricingConfigStatus.Retired; e.Status=PricingConfigStatus.Active; await db.SaveChangesAsync(); return Ok(e); }
    [HttpPost("{id:int}/retire")] public async Task<IActionResult> Retire(int id){ var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); e.Status=PricingConfigStatus.Retired; await db.SaveChangesAsync(); return Ok(e); }
}
