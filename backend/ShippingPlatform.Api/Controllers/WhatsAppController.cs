using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class WhatsAppController(IWhatsAppBusiness business) : ControllerBase
{
    // Tokens issued by TokenService always carry NameIdentifier; a parse failure
    // means a malformed token — reject rather than mis-attribute to user #1.
    private int? AdminIdOrNull => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var aid) ? aid : null;

    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/shipments/{id:int}/whatsapp/status/bulk")] public async Task<IActionResult> StatusBulk(int id) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendBulkAsync(id, CampaignType.StatusUpdate, aid));
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/shipments/{id:int}/whatsapp/photos/departure/bulk")] public async Task<IActionResult> DepBulk(int id) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendBulkAsync(id, CampaignType.DeparturePhotos, aid));
    [Authorize(Roles = "Admin,Manager")] [HttpPost("api/shipments/{id:int}/whatsapp/photos/arrival/bulk")] public async Task<IActionResult> ArrBulk(int id) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendBulkAsync(id, CampaignType.ArrivalPhotos, aid));

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("api/customers/{customerId:int}/whatsapp/status")]
    public async Task<IActionResult> StatusOne(int customerId, [FromQuery] int shipmentId) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.StatusUpdate, aid));
    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/departure")]
    public async Task<IActionResult> DepOne(int customerId, [FromQuery] int shipmentId) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.DeparturePhotos, aid));
    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/arrival")]
    public async Task<IActionResult> ArrOne(int customerId, [FromQuery] int shipmentId) => AdminIdOrNull is not { } aid ? Unauthorized() : Ok(await business.SendIndividualAsync(customerId, shipmentId, CampaignType.ArrivalPhotos, aid));

    [Authorize(Roles = "Admin,Manager,Accountant")] [HttpGet("api/whatsapp/campaigns")] public async Task<IActionResult> Campaigns() => Ok(await business.CampaignsAsync());
    [Authorize(Roles = "Admin,Manager,Accountant")] [HttpGet("api/whatsapp/campaigns/{id:int}")] public async Task<IActionResult> Campaign(int id) => Ok(await business.CampaignAsync(id));
}
