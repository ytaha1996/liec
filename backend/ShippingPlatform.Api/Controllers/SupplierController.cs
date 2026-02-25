using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SupplierController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<SupplierDto>>> List() => Ok((await db.Suppliers.ToListAsync()).Select(x => x.ToDto()));
    [HttpGet("{id:int}")] public async Task<ActionResult<SupplierDto>> Get(int id) => await db.Suppliers.FindAsync(id) is { } e ? Ok(e.ToDto()) : NotFound();
    [HttpPost] public async Task<ActionResult<SupplierDto>> Create(UpsertSupplierRequest req) { var e = new Supplier { Name=req.Name, Email=req.Email, IsActive=req.IsActive }; db.Suppliers.Add(e); await db.SaveChangesAsync(); return Created($"/api/suppliers/{e.Id}", e.ToDto()); }
    [HttpPut("{id:int}")] public async Task<ActionResult<SupplierDto>> Update(int id, UpsertSupplierRequest req) { var e=await db.Suppliers.FindAsync(id); if(e is null) return NotFound(); e.Name=req.Name; e.Email=req.Email; e.IsActive=req.IsActive; await db.SaveChangesAsync(); return Ok(e.ToDto()); }
}
