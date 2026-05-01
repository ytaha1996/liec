using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/shipments")]
public class ShipmentsController(IShipmentBusiness business, IPackageBusiness packageBusiness) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ShipmentStatus? status = null, [FromQuery] string? q = null, [FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] int? page = null, [FromQuery] int pageSize = 25) => Ok(await business.ListAsync(status, q, dateFrom, dateTo, page, pageSize));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => (await business.GetAsync(id)) is { } s ? Ok(s) : NotFound();

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateShipmentRequest input)
    {
        var (dto, error) = await business.CreateAsync(input);
        if (dto is null) return BadRequest(new { code = "VALIDATION_ERROR", message = error });
        return Created($"/api/shipments/{dto.Id}", dto);
    }

    [Authorize(Roles = "Admin,Manager")] [HttpPost("{id:int}/schedule")] public Task<IActionResult> Schedule(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("{id:int}/activate")] public Task<IActionResult> Activate(int id) => SetStatus(id, ShipmentStatus.Scheduled);
    [HttpGet("{id:int}/ready-to-depart/preview")] public async Task<IActionResult> ReadyToDepartPreview(int id) => Ok(await business.PreviewReadyToDepartAsync(id));
    [Authorize(Roles = "Admin,Manager")] [HttpPost("{id:int}/ready-to-depart")] public Task<IActionResult> ReadyToDepart(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("{id:int}/load")] public Task<IActionResult> Load(int id) => SetStatus(id, ShipmentStatus.ReadyToDepart);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("{id:int}/cancel")] public Task<IActionResult> Cancel(int id) => SetStatus(id, ShipmentStatus.Cancelled);

    [Authorize(Roles = "Admin,Manager")]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateShipmentRequest req)
    {
        var (dto, err) = await business.UpdateAsync(id, req);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("{id:int}/arrive")]
    public async Task<IActionResult> Arrive(int id)
    {
        var (dto, err) = await business.SetStatusAsync(id, ShipmentStatus.Arrived);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("{id:int}/depart")]
    [HttpPost("{id:int}/ship")]
    public async Task<IActionResult> Depart(int id)
    {
        var (dto, gate, err) = await business.DepartAsync(id);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("{id:int}/close")]
    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> Close(int id)
    {
        var (dto, gate, err) = await business.CloseAsync(id);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("{id:int}/audit-log")]
    public async Task<IActionResult> AuditLog(int id, [FromServices] ShippingPlatform.Api.Services.IAuditService audit) => Ok(await audit.GetLogsAsync("Shipment", id));

    [HttpGet("{id:int}/media")]
    public async Task<IActionResult> Media(int id) => Ok(await business.MediaAsync(id));

    [HttpGet("{id:int}/fx-snapshots")]
    public async Task<IActionResult> FxSnapshots(int id, [FromServices] ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService fx) =>
        Ok((await fx.GetAsync(id)).Select(x => x.ToDto()));

    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("{id:int}/fx-snapshots/{currencyCode}")]
    public async Task<IActionResult> UpsertManualRate(
        int id,
        string currencyCode,
        UpsertManualRateRequest req,
        [FromServices] ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService fx,
        [FromServices] Data.AppDbContext db)
    {
        var code = currencyCode.ToUpperInvariant();
        var currency = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(db.Currencies, x => x.Code == code);
        if (currency is null || !currency.IsActive)
            return Conflict(new { code = "CURRENCY_NOT_FOUND", message = $"Active currency '{code}' not found." });
        await fx.UpsertManualAsync(id, code, req.RateToBase);
        return NoContent();
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpDelete("{id:int}/fx-snapshots/{currencyCode}")]
    public async Task<IActionResult> DeleteManualRate(
        int id,
        string currencyCode,
        [FromServices] ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService fx)
    {
        await fx.DeleteManualAsync(id, currencyCode.ToUpperInvariant());
        return NoContent();
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("{shipmentId:int}/packages/bulk-transition")]
    public async Task<IActionResult> BulkTransition(int shipmentId, BulkTransitionRequest request)
    {
        try
        {
            var (transitioned, err) = await packageBusiness.BulkTransitionAsync(shipmentId, request);
            return err is null ? Ok(new { transitioned }) : BadRequest(err);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = "INVALID_ACTION", message = ex.Message });
        }
    }

    private async Task<IActionResult> SetStatus(int id, ShipmentStatus status)
    {
        var (dto, err) = await business.SetStatusAsync(id, status);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
