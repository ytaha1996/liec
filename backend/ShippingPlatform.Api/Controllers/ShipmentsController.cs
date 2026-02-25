using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/shipments")]
public class ShipmentsController(AppDbContext db, IRefCodeService refs, IPhotoComplianceService gates) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await db.Shipments.Include(x => x.Packages).ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => Ok(await db.Shipments.Include(x => x.Packages).FirstOrDefaultAsync(x => x.Id == id));

    [HttpPost]
    public async Task<IActionResult> Create(Shipment input)
    {
        input.RefCode = await refs.GenerateAsync(input.OriginWarehouseId);
        db.Shipments.Add(input); await db.SaveChangesAsync(); return Created($"/api/shipments/{input.Id}", input);
    }

    [HttpPost("{id:int}/schedule")] public Task<IActionResult> Schedule(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [HttpPost("{id:int}/ready-to-depart")] public Task<IActionResult> ReadyToDepart(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);
    [HttpPost("{id:int}/arrive")] public async Task<IActionResult> Arrive(int id) { var s=await db.Shipments.FindAsync(id); if(s is null) return NotFound(); s.Status=ShipmentStatus.Arrived; s.ActualArrivalAt=DateTime.UtcNow; await db.SaveChangesAsync(); return Ok(s); }

    [HttpPost("{id:int}/depart")]
    public async Task<IActionResult> Depart(int id)
    {
        var missing = await gates.MissingForShipmentDepartureAsync(id);
        if (missing.Count > 0) return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot depart until all packages have departure photos.", missing));
        var s = await db.Shipments.FindAsync(id); if (s is null) return NotFound(); s.Status = ShipmentStatus.Departed; s.ActualDepartureAt = DateTime.UtcNow; await db.SaveChangesAsync(); return Ok(s);
    }

    [HttpPost("{id:int}/close")]
    public async Task<IActionResult> Close(int id)
    {
        var missing = await gates.MissingForShipmentCloseAsync(id);
        if (missing.Count > 0) return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot close until all packages have arrival photos and are finalized.", missing));
        var s = await db.Shipments.FindAsync(id); if (s is null) return NotFound(); s.Status = ShipmentStatus.Closed; await db.SaveChangesAsync(); return Ok(s);
    }

    [HttpGet("{id:int}/media")]
    public async Task<IActionResult> Media(int id)
    {
        var rows = await db.Packages.Where(x => x.ShipmentId == id).Include(x => x.Media).Select(x => new { packageId = x.Id, customerId = x.CustomerId, media = x.Media }).ToListAsync();
        return Ok(rows);
    }

    private async Task<IActionResult> SetStatus(int id, ShipmentStatus status) { var s = await db.Shipments.FindAsync(id); if (s is null) return NotFound(); s.Status = status; await db.SaveChangesAsync(); return Ok(s); }
}
