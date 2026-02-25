using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/pricing-configs")]
public class PricingConfigController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<PricingConfigDto>>> List() => Ok((await db.PricingConfigs.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<PricingConfigDto>> Get(int id) => await db.PricingConfigs.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<PricingConfigDto>> Create(UpsertPricingConfigRequest req) { var e = new PricingConfig { Name=req.Name, Currency=req.Currency, EffectiveFrom=req.EffectiveFrom, EffectiveTo=req.EffectiveTo, DefaultRatePerKg=req.DefaultRatePerKg, DefaultRatePerM3=req.DefaultRatePerM3, Status=req.Status }; db.PricingConfigs.Add(e); await db.SaveChangesAsync(); return Created($"/api/pricing-configs/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<PricingConfigDto>> Update(int id, UpsertPricingConfigRequest req) { var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); e.Name=req.Name; e.Currency=req.Currency; e.EffectiveFrom=req.EffectiveFrom; e.EffectiveTo=req.EffectiveTo; e.DefaultRatePerKg=req.DefaultRatePerKg; e.DefaultRatePerM3=req.DefaultRatePerM3; e.Status=req.Status; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
    [HttpPost("{id:int}/activate")] public async Task<IActionResult> Activate(int id){ var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); foreach(var p in db.PricingConfigs.Where(x=>x.Status==PricingConfigStatus.Active)) p.Status=PricingConfigStatus.Retired; e.Status=PricingConfigStatus.Active; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
    [HttpPost("{id:int}/retire")] public async Task<IActionResult> Retire(int id){ var e=await db.PricingConfigs.FindAsync(id); if(e is null) return NotFound(); e.Status=PricingConfigStatus.Retired; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
}
