using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomerController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> List([FromQuery] string? q = null)
    {
        var query = db.Customers.Include(x => x.WhatsAppConsent).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.CustomerRef.Contains(q) || x.Name.Contains(q) || x.PrimaryPhone.Contains(q));
        return Ok(await query.OrderBy(x => x.Name).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Customer>> Get(int id) => await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id) is { } e ? Ok(e) : NotFound();

    [HttpPost]
    public async Task<ActionResult<Customer>> Create(Customer entity)
    {
        db.Customers.Add(entity);
        await db.SaveChangesAsync();
        if (entity.WhatsAppConsent is null)
        {
            db.WhatsAppConsents.Add(new WhatsAppConsent { CustomerId = entity.Id, OptInStatusUpdates = true, OptInDeparturePhotos = true, OptInArrivalPhotos = true });
            await db.SaveChangesAsync();
        }
        return Created($"/api/customers/{entity.Id}", entity);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Customer>> Update(int id, Customer input)
    {
        var e = await db.Customers.FindAsync(id);
        if (e is null) return NotFound();
        var immutableRef = e.CustomerRef;
        db.Entry(e).CurrentValues.SetValues(input);
        e.Id = id;
        e.CustomerRef = immutableRef;
        await db.SaveChangesAsync();
        return Ok(e);
    }

    [HttpPatch("{id:int}/whatsapp-consent")]
    public async Task<IActionResult> PatchConsent(int id, WhatsAppConsent consent)
    {
        var c = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        if (c.WhatsAppConsent is null)
        {
            consent.CustomerId = id;
            c.WhatsAppConsent = consent;
        }
        else
        {
            c.WhatsAppConsent.OptInStatusUpdates = consent.OptInStatusUpdates;
            c.WhatsAppConsent.OptInDeparturePhotos = consent.OptInDeparturePhotos;
            c.WhatsAppConsent.OptInArrivalPhotos = consent.OptInArrivalPhotos;
            c.WhatsAppConsent.OptedOutAt = consent.OptedOutAt;
        }
        await db.SaveChangesAsync();
        return Ok(c.WhatsAppConsent);
    }
}
