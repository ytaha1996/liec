using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class WhatsAppController(IWhatsAppBusiness business) : ControllerBase
{
    private int AdminId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var aid) ? aid : 1;

    [HttpPost("api/shipments/{id:int}/whatsapp/status/bulk")] public async Task<IActionResult> StatusBulk(int id) => Ok(await business.SendBulkAsync(id, CampaignType.StatusUpdate, AdminId));
    [HttpPost("api/shipments/{id:int}/whatsapp/photos/departure/bulk")] public async Task<IActionResult> DepBulk(int id) => Ok(await business.SendBulkAsync(id, CampaignType.DeparturePhotos, AdminId));
    [HttpPost("api/shipments/{id:int}/whatsapp/photos/arrival/bulk")] public async Task<IActionResult> ArrBulk(int id) => Ok(await business.SendBulkAsync(id, CampaignType.ArrivalPhotos, AdminId));

    [HttpPost("api/customers/{customerId:int}/whatsapp/status")]
    public async Task<IActionResult> StatusOne(int customerId, [FromQuery] int shipmentId) => Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.StatusUpdate, AdminId));
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/departure")]
    public async Task<IActionResult> DepOne(int customerId, [FromQuery] int shipmentId) => Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.DeparturePhotos, AdminId));
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/arrival")]
    public async Task<IActionResult> ArrOne(int customerId, [FromQuery] int shipmentId) => Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.ArrivalPhotos, AdminId));

    [HttpGet("api/whatsapp/campaigns")] public async Task<IActionResult> Campaigns() => Ok(await business.CampaignsAsync());
    [HttpGet("api/whatsapp/campaigns/{id:int}")] public async Task<IActionResult> Campaign(int id) => Ok(await business.CampaignAsync(id));
}
