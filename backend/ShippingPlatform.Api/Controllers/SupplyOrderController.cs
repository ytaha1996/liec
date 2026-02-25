using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/supply-orders")]
public class SupplyOrderController(AppDbContext db, ITransitionRuleService transitions) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<SupplyOrderDto>>> List() => Ok((await db.SupplyOrders.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<SupplyOrderDto>> Get(int id) => await db.SupplyOrders.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<SupplyOrderDto>> Create(UpsertSupplyOrderRequest req) { var e = new SupplyOrder { CustomerId=req.CustomerId, SupplierId=req.SupplierId, PackageId=req.PackageId, Name=req.Name, PurchasePrice=req.PurchasePrice, Details=req.Details, Status=SupplyOrderStatus.Draft }; db.SupplyOrders.Add(e); await db.SaveChangesAsync(); return Created($"/api/supply-orders/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<SupplyOrderDto>> Update(int id, UpsertSupplyOrderRequest req) { var e=await db.SupplyOrders.FindAsync(id); if(e is null) return NotFound(); e.CustomerId=req.CustomerId; e.SupplierId=req.SupplierId; e.PackageId=req.PackageId; e.Name=req.Name; e.PurchasePrice=req.PurchasePrice; e.Details=req.Details; await db.SaveChangesAsync(); return Ok(e.ToDto()); }

    [HttpPost("{id:int}/transition")]
    public async Task<IActionResult> Transition(int id, SupplyOrderTransitionRequest req)
    {
        var e = await db.SupplyOrders.FindAsync(id);
        if (e is null) return NotFound();
        if (!transitions.CanMove(e.Status, req.Status, req.CancelReason, out var message)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message });
        e.Status = req.Status;
        e.CancelReason = req.Status == SupplyOrderStatus.Cancelled ? req.CancelReason : null;
        await db.SaveChangesAsync();
        return Ok(e.ToDto());
    }
}
