using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomerController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<Customer>>> List() => Ok(await db.Customers.ToListAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<Customer>> Get(int id) => await db.Customers.FindAsync(id) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<Customer>> Create(Customer entity) { db.Customers.Add(entity); await db.SaveChangesAsync(); return Created($"/api/customers/{entity.Id}", entity); }
    [HttpPut("{id:int}")] public async Task<ActionResult<Customer>> Update(int id, Customer input) { var e=await db.Customers.FindAsync(id); if(e is null) return NotFound(); db.Entry(e).CurrentValues.SetValues(input); e.Id=id; await db.SaveChangesAsync(); return Ok(e); }
    [HttpPatch("{id:int}/whatsapp-consent")] public async Task<IActionResult> PatchConsent(int id, WhatsAppConsent consent){ var c=await db.Customers.Include(x=>x.WhatsAppConsent).FirstOrDefaultAsync(x=>x.Id==id); if(c is null) return NotFound(); consent.CustomerId=id; c.WhatsAppConsent=consent; await db.SaveChangesAsync(); return Ok(c.WhatsAppConsent); }
}
