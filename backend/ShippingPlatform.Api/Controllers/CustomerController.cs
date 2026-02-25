using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomerController(ICustomerBusiness business) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> List([FromQuery] string? q = null) => Ok(await business.ListAsync(q));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerDto>> Get(int id) => (await business.GetAsync(id)) is { } c ? Ok(c) : NotFound();

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerRequest req)
    {
        var c = await business.CreateAsync(req);
        return Created($"/api/customers/{c.Id}", c);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerDto>> Update(int id, UpdateCustomerRequest input) => (await business.UpdateAsync(id, input)) is { } e ? Ok(e) : NotFound();

    [HttpPatch("{id:int}/whatsapp-consent")]
    public async Task<IActionResult> PatchConsent(int id, WhatsAppConsentDto consent)
    {
        var dto = await business.PatchConsentAsync(id, consent);
        return dto is null ? NotFound() : Ok(dto);
    }
}
