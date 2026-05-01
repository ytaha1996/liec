using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class PackagesController(IPackageBusiness business) : ControllerBase
{
    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("api/shipments/{shipmentId:int}/packages")]
    public async Task<IActionResult> Create(int shipmentId, CreatePackageRequest input)
    {
        var (dto, err) = await business.CreateAsync(shipmentId, input);
        if (err is not null) return Conflict(err);
        return Created($"/api/packages/{dto!.Id}", dto);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("api/packages/auto-assign")]
    public async Task<IActionResult> AutoAssign(AutoAssignPackageRequest input)
    {
        var (dto, err) = await business.AutoAssignAsync(input);
        if (err is not null) return Conflict(err);
        return Created($"/api/packages/{dto!.Id}", dto);
    }

    [HttpGet("api/packages")]
    public async Task<IActionResult> List([FromQuery] string? q = null, [FromQuery] int? customerId = null, [FromQuery] int? shipmentId = null, [FromQuery] PackageStatus? status = null, [FromQuery] int? page = null, [FromQuery] int pageSize = 25) => Ok(await business.ListAsync(q, customerId, shipmentId, status, page, pageSize));

    [HttpGet("api/packages/{id:int}")]
    public async Task<IActionResult> Get(int id) => (await business.GetAsync(id)) is { } p ? Ok(p) : NotFound();

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpPatch("api/packages/{id:int}")]
    public async Task<IActionResult> Update(int id, UpdatePackageRequest req)
    {
        var (dto, err) = await business.UpdatePackageAsync(id, req);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager,Field")] [HttpPost("api/packages/{id:int}/receive")] public Task<IActionResult> Receive(int id) => Change(id, PackageStatus.Received);
    [Authorize(Roles = "Admin,Manager,Field")] [HttpPost("api/packages/{id:int}/pack")] public Task<IActionResult> Pack(int id) => Change(id, PackageStatus.Packed);
    [Authorize(Roles = "Admin,Manager,Field")] [HttpPost("api/packages/{id:int}/ready-to-ship")] public Task<IActionResult> Ready(int id) => Change(id, PackageStatus.ReadyToShip);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/packages/{id:int}/cancel")] public Task<IActionResult> Cancel(int id) => Change(id, PackageStatus.Cancelled);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/packages/{id:int}/ship")] public Task<IActionResult> Ship(int id) => Change(id, PackageStatus.Shipped, checkDepartureGate: true);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/packages/{id:int}/arrive-destination")] public Task<IActionResult> ArriveDestination(int id) => Change(id, PackageStatus.ArrivedAtDestination);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/packages/{id:int}/ready-for-handout")] public Task<IActionResult> ReadyForHandout(int id) => Change(id, PackageStatus.ReadyForHandout);
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/packages/{id:int}/handout")] public Task<IActionResult> Handout(int id) => Change(id, PackageStatus.HandedOut, checkArrivalGate: true);

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpPost("api/packages/{id:int}/items")]
    public async Task<IActionResult> AddItem(int id, UpsertPackageItemRequest item)
    {
        var (dto, err) = await business.AddItemAsync(id, item);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpPut("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> UpdateItem(int id, int itemId, UpsertPackageItemRequest input)
    {
        var (dto, err) = await business.UpdateItemAsync(id, itemId, input);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpDelete("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> DeleteItem(int id, int itemId)
    {
        var result = await business.DeleteItemAsync(id, itemId);
        if (result is null) return NotFound();
        if (result.GetType().GetProperty("code") is not null) return Conflict(result);
        return NoContent();
    }

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpPost("api/packages/{id:int}/media")]
    public async Task<IActionResult> UploadMedia(int id, [FromForm] MediaUploadRequest req)
    {
        req.AdminUserId = int.TryParse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier), out var aid) ? aid : (int?)null;
        var result = await business.UploadMediaAsync(id, req);
        if (result is null) return NotFound();
        if (result.GetType().GetProperty("code") is not null) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("api/packages/{id:int}/media")]
    public async Task<IActionResult> ListMedia(int id) => Ok(await business.ListMediaAsync(id));

    [Authorize(Roles = "Admin,Manager,Field")]
    [HttpDelete("api/packages/{id:int}/media/{mediaId:int}")]
    public async Task<IActionResult> DeleteMedia(int id, int mediaId)
    {
        var result = await business.DeleteMediaAsync(id, mediaId);
        if (result is null) return NotFound();
        if (result.GetType().GetProperty("code") is not null) return BadRequest(result);
        return Ok(result);
    }

    [Authorize(Roles = "Admin,Manager,Accountant")]
    [HttpPost("api/packages/{id:int}/pricing-override")]
    public async Task<IActionResult> ApplyPricingOverride(int id, ApplyPricingOverrideRequest req)
    {
        var adminId = int.TryParse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier), out var aid) ? aid : 1;
        var (dto, err) = await business.ApplyPricingOverrideAsync(id, req, adminId);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpGet("api/packages/{id:int}/pricing-overrides")]
    public async Task<IActionResult> GetPricingOverrides(int id) => Ok(await business.GetPricingOverridesAsync(id));

    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("api/packages/{id:int}/audit-log")]
    public async Task<IActionResult> AuditLog(int id, [FromServices] ShippingPlatform.Api.Services.IAuditService audit) => Ok(await audit.GetLogsAsync("Package", id));

    private async Task<IActionResult> Change(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false)
    {
        var (dto, err, gate) = await business.ChangeStatusAsync(id, status, checkDepartureGate, checkArrivalGate);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
