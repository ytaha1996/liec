using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/shipments")]
public class ShipmentsController(AppDbContext db, IRefCodeService refs, IPhotoComplianceService gates, ITransitionRuleService transitions) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ShipmentStatus? status = null)
    {
        var q = db.Shipments.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.Status == status);
        return Ok((await q.OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(x => x.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? NotFound() : Ok(s.ToDto());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateShipmentRequest input)
    {
        if (input.OriginWarehouseId == input.DestinationWarehouseId)
            return BadRequest(new { code = "VALIDATION_ERROR", message = "Origin and destination warehouse must be different." });

        var shipment = new Shipment
        {
            OriginWarehouseId = input.OriginWarehouseId,
            DestinationWarehouseId = input.DestinationWarehouseId,
            PlannedDepartureDate = input.PlannedDepartureDate,
            PlannedArrivalDate = input.PlannedArrivalDate,
            Status = ShipmentStatus.Draft,
            RefCode = await refs.GenerateAsync(input.OriginWarehouseId)
        };

        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        return Created($"/api/shipments/{shipment.Id}", shipment.ToDto());
    }

    [HttpPost("{id:int}/schedule")] public Task<IActionResult> Schedule(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [HttpPost("{id:int}/ready-to-depart")] public Task<IActionResult> ReadyToDepart(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);

    [HttpPost("{id:int}/arrive")]
    public async Task<IActionResult> Arrive(int id)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return NotFound();
        if (!transitions.CanMove(s.Status, ShipmentStatus.Arrived)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Arrived." });
        s.Status = ShipmentStatus.Arrived;
        s.ActualArrivalAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(s.ToDto());
    }

    [HttpPost("{id:int}/depart")]
    public async Task<IActionResult> Depart(int id)
    {
        var missing = await gates.MissingForShipmentDepartureAsync(id);
        if (missing.Count > 0)
            return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot depart until all packages have departure photos.", missing));

        var s = await db.Shipments.FindAsync(id);
        if (s is null) return NotFound();
        if (!transitions.CanMove(s.Status, ShipmentStatus.Departed)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Departed." });
        s.Status = ShipmentStatus.Departed;
        s.ActualDepartureAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(s.ToDto());
    }

    [HttpPost("{id:int}/close")]
    public async Task<IActionResult> Close(int id)
    {
        var missing = await gates.MissingForShipmentCloseAsync(id);
        if (missing.Count > 0)
            return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot close until all packages have arrival photos and are finalized.", missing));

        var s = await db.Shipments.FindAsync(id);
        if (s is null) return NotFound();
        if (!transitions.CanMove(s.Status, ShipmentStatus.Closed)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Closed." });
        s.Status = ShipmentStatus.Closed;
        await db.SaveChangesAsync();
        return Ok(s.ToDto());
    }

    [HttpGet("{id:int}/media")]
    public async Task<IActionResult> Media(int id)
    {
        var rows = await db.Packages
            .Where(x => x.ShipmentId == id)
            .Include(x => x.Media)
            .Select(x => new { packageId = x.Id, customerId = x.CustomerId, media = x.Media.Select(m => new { m.Id, m.Stage, m.PublicUrl, m.CapturedAt }) })
            .ToListAsync();
        return Ok(rows);
    }

    private async Task<IActionResult> SetStatus(int id, ShipmentStatus status)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return NotFound();
        if (!transitions.CanMove(s.Status, status)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to {status}." });
        s.Status = status;
        await db.SaveChangesAsync();
        return Ok(s.ToDto());
    }
}
