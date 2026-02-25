using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SupplierController(IMasterDataBusiness business) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<IEnumerable<SupplierDto>>> List() => Ok(await business.ListSuppliersAsync());
    [HttpGet("{id:int}")] public async Task<ActionResult<SupplierDto>> Get(int id) => (await business.GetSupplierAsync(id)) is { } e ? Ok(e) : NotFound();
    [HttpPost] public async Task<ActionResult<SupplierDto>> Create(UpsertSupplierRequest req) { var e = await business.CreateSupplierAsync(req); return Created($"/api/suppliers/{e.Id}", e); }
    [HttpPut("{id:int}")] public async Task<ActionResult<SupplierDto>> Update(int id, UpsertSupplierRequest req) => (await business.UpdateSupplierAsync(id, req)) is { } e ? Ok(e) : NotFound();
}
