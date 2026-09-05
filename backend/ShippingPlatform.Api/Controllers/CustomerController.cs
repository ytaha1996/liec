using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize(Roles = "Admin,Manager,Accountant")]
public class CustomerController(ICustomerBusiness business, IPackageBusiness packageBusiness) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> List([FromQuery] string? q = null) => Ok(await business.ListAsync(q));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerDto>> Get(int id) => (await business.GetAsync(id)) is { } c ? Ok(c) : NotFound();

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateCustomerRequest req)
    {
        var (dto, error) = await business.CreateAsync(req);
        if (error is not null) return Conflict(new { code = "DUPLICATE_PHONE", message = error });
        return Created($"/api/customers/{dto!.Id}", dto);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateCustomerRequest input)
    {
        var (dto, error, notFound) = await business.UpdateAsync(id, input);
        if (notFound) return NotFound();
        if (error is not null) return Conflict(new { code = "DUPLICATE_PHONE", message = error });
        return Ok(dto);
    }

    [HttpGet("{id:int}/packages")]
    public async Task<IActionResult> Packages(int id) => Ok(await packageBusiness.ListAsync(customerId: id));

    [Authorize(Roles = "Admin,Manager")]
    [HttpPatch("{id:int}/whatsapp-consent")]
    public async Task<IActionResult> PatchConsent(int id, WhatsAppConsentDto consent)
    {
        var dto = await business.PatchConsentAsync(id, consent);
        return dto is null ? NotFound() : Ok(dto);
    }
}
