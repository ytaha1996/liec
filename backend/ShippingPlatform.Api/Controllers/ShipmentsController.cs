using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/shipments")]
public class ShipmentsController(IShipmentBusiness business) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ShipmentStatus? status = null) => Ok(await business.ListAsync(status));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => (await business.GetAsync(id)) is { } s ? Ok(s) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateShipmentRequest input)
    {
        var (dto, error) = await business.CreateAsync(input);
        if (dto is null) return BadRequest(new { code = "VALIDATION_ERROR", message = error });
        return Created($"/api/shipments/{dto.Id}", dto);
    }

    [HttpPost("{id:int}/schedule")] public Task<IActionResult> Schedule(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [HttpPost("{id:int}/activate")] public Task<IActionResult> Activate(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [HttpPost("{id:int}/ready-to-depart")] public Task<IActionResult> ReadyToDepart(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);
    [HttpPost("{id:int}/load")] public Task<IActionResult> Load(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);
    [HttpPost("{id:int}/cancel")] public Task<IActionResult> Cancel(int id) => SetStatus(id, ShipmentStatus.Cancelled);

    [HttpPatch("{id:int}/tiiu")]
    public async Task<IActionResult> UpdateTiiu(int id, UpdateShipmentTiiuRequest req)
    {
        var (dto, err) = await business.UpdateTiiuAsync(id, req.TiiuCode);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpPost("{id:int}/arrive")]
    public async Task<IActionResult> Arrive(int id)
    {
        var (dto, err) = await business.SetStatusAsync(id, ShipmentStatus.Arrived);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpPost("{id:int}/depart")]
    [HttpPost("{id:int}/ship")]
    public async Task<IActionResult> Depart(int id)
    {
        var (dto, gate, err) = await business.DepartAsync(id);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpPost("{id:int}/close")]
    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> Close(int id)
    {
        var (dto, gate, err) = await business.CloseAsync(id);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpPost("{id:int}/tracking/sync")]
    public async Task<IActionResult> SyncTracking(int id, ShipmentTrackingSyncRequest req, CancellationToken ct)
    {
        var (dto, err) = await business.SyncTrackingAsync(id, req.Code, ct);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpGet("{id:int}/media")]
    public async Task<IActionResult> Media(int id) => Ok(await business.MediaAsync(id));

    private async Task<IActionResult> SetStatus(int id, ShipmentStatus status)
    {
        var (dto, err) = await business.SetStatusAsync(id, status);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
