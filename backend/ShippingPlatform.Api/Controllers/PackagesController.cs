using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class PackagesController(IPackageBusiness business) : ControllerBase
{
    [HttpPost("api/shipments/{shipmentId:int}/packages")]
    public async Task<IActionResult> Create(int shipmentId, CreatePackageRequest input)
    {
        var p = await business.CreateAsync(shipmentId, input);
        return Created($"/api/packages/{p.Id}", p);
    }

    [HttpPost("api/packages/auto-assign")]
    public async Task<IActionResult> AutoAssign(CreatePackageRequest input)
    {
        var (dto, err) = await business.AutoAssignAsync(input);
        if (err is not null) return Conflict(err);
        return Created($"/api/packages/{dto!.Id}", dto);
    }

    [HttpGet("api/packages")]
    public async Task<IActionResult> List() => Ok(await business.ListAsync());

    [HttpGet("api/packages/{id:int}")]
    public async Task<IActionResult> Get(int id) => (await business.GetAsync(id)) is { } p ? Ok(p) : NotFound();

    [HttpPost("api/packages/{id:int}/receive")] public Task<IActionResult> Receive(int id) => Change(id, PackageStatus.Received);
    [HttpPost("api/packages/{id:int}/pack")] public Task<IActionResult> Pack(int id) => Change(id, PackageStatus.Packed);
    [HttpPost("api/packages/{id:int}/ready-to-ship")] public Task<IActionResult> Ready(int id) => Change(id, PackageStatus.ReadyToShip);
    [HttpPost("api/packages/{id:int}/cancel")] public Task<IActionResult> Cancel(int id) => Change(id, PackageStatus.Cancelled);
    [HttpPost("api/packages/{id:int}/ship")] public Task<IActionResult> Ship(int id) => Change(id, PackageStatus.Shipped, checkDepartureGate: true);
    [HttpPost("api/packages/{id:int}/arrive-destination")] public Task<IActionResult> ArriveDestination(int id) => Change(id, PackageStatus.ArrivedAtDestination);
    [HttpPost("api/packages/{id:int}/ready-for-handout")] public Task<IActionResult> ReadyForHandout(int id) => Change(id, PackageStatus.ReadyForHandout);
    [HttpPost("api/packages/{id:int}/handout")] public Task<IActionResult> Handout(int id) => Change(id, PackageStatus.HandedOut, checkArrivalGate: true);

    [HttpPost("api/packages/{id:int}/items")]
    public async Task<IActionResult> AddItem(int id, UpsertPackageItemRequest item)
    {
        var (dto, err) = await business.AddItemAsync(id, item);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpPut("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> UpdateItem(int id, int itemId, UpsertPackageItemRequest input)
    {
        var (dto, err) = await business.UpdateItemAsync(id, itemId, input);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }

    [HttpDelete("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> DeleteItem(int id, int itemId)
    {
        var result = await business.DeleteItemAsync(id, itemId);
        if (result is null) return NotFound();
        if (result.GetType().GetProperty("code") is not null) return Conflict(result);
        return NoContent();
    }

    [HttpPost("api/packages/{id:int}/media")]
    public async Task<IActionResult> UploadMedia(int id, [FromForm] MediaUploadRequest req)
    {
        var result = await business.UploadMediaAsync(id, req);
        if (result is null) return NotFound();
        if (result.GetType().GetProperty("code") is not null) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("api/packages/{id:int}/media")]
    public async Task<IActionResult> ListMedia(int id) => Ok(await business.ListMediaAsync(id));

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

    private async Task<IActionResult> Change(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false)
    {
        var (dto, err, gate) = await business.ChangeStatusAsync(id, status, checkDepartureGate, checkArrivalGate);
        if (gate is not null) return Conflict(gate);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
