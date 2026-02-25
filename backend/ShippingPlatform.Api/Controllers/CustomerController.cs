using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomerController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> List([FromQuery] string? q = null)
    {
        var query = db.Customers.Include(x => x.WhatsAppConsent).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.CustomerRef.Contains(q) || x.Name.Contains(q) || x.PrimaryPhone.Contains(q));
        return Ok((await query.OrderBy(x => x.Name).ToListAsync()).Select(x => x.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerDto>> Get(int id)
    {
        var c = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? NotFound() : Ok(c.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerRequest req)
    {
        var entity = new Customer { CustomerRef = req.CustomerRef, Name = req.Name, PrimaryPhone = req.PrimaryPhone, Email = req.Email, IsActive = req.IsActive };
        db.Customers.Add(entity);
        await db.SaveChangesAsync();
        db.WhatsAppConsents.Add(new WhatsAppConsent { CustomerId = entity.Id, OptInStatusUpdates = true, OptInDeparturePhotos = true, OptInArrivalPhotos = true });
        await db.SaveChangesAsync();
        await db.Entry(entity).Reference(x => x.WhatsAppConsent).LoadAsync();
        return Created($"/api/customers/{entity.Id}", entity.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerDto>> Update(int id, UpdateCustomerRequest input)
    {
        var e = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        if (e is null) return NotFound();
        e.Name = input.Name; e.PrimaryPhone = input.PrimaryPhone; e.Email = input.Email; e.IsActive = input.IsActive;
        await db.SaveChangesAsync();
        return Ok(e.ToDto());
    }

    [HttpPatch("{id:int}/whatsapp-consent")]
    public async Task<IActionResult> PatchConsent(int id, WhatsAppConsentDto consent)
    {
        var c = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        if (c.WhatsAppConsent is null)
        {
            c.WhatsAppConsent = new WhatsAppConsent { CustomerId = id };
        }
        c.WhatsAppConsent.OptInStatusUpdates = consent.OptInStatusUpdates;
        c.WhatsAppConsent.OptInDeparturePhotos = consent.OptInDeparturePhotos;
        c.WhatsAppConsent.OptInArrivalPhotos = consent.OptInArrivalPhotos;
        c.WhatsAppConsent.OptedOutAt = consent.OptedOutAt;

        await db.SaveChangesAsync();
        return Ok(new WhatsAppConsentDto(c.WhatsAppConsent.OptInStatusUpdates, c.WhatsAppConsent.OptInDeparturePhotos, c.WhatsAppConsent.OptInArrivalPhotos, c.WhatsAppConsent.OptedOutAt));
    }
}
