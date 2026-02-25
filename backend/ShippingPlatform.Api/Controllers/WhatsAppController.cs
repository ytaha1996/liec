using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class WhatsAppController(AppDbContext db, IWhatsAppSender sender)
    : ControllerBase
{
    [HttpPost("api/shipments/{id:int}/whatsapp/status/bulk")] public Task<IActionResult> StatusBulk(int id) => SendBulk(id, CampaignType.StatusUpdate);
    [HttpPost("api/shipments/{id:int}/whatsapp/photos/departure/bulk")] public Task<IActionResult> DepBulk(int id) => SendBulk(id, CampaignType.DeparturePhotos);
    [HttpPost("api/shipments/{id:int}/whatsapp/photos/arrival/bulk")] public Task<IActionResult> ArrBulk(int id) => SendBulk(id, CampaignType.ArrivalPhotos);

    [HttpPost("api/customers/{customerId:int}/whatsapp/status")]
    public Task<IActionResult> StatusOne(int customerId, [FromQuery] int shipmentId) => SendIndividual(customerId, shipmentId, CampaignType.StatusUpdate);
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/departure")]
    public Task<IActionResult> DepOne(int customerId, [FromQuery] int shipmentId) => SendIndividual(customerId, shipmentId, CampaignType.DeparturePhotos);
    [HttpPost("api/customers/{customerId:int}/whatsapp/photos/arrival")]
    public Task<IActionResult> ArrOne(int customerId, [FromQuery] int shipmentId) => SendIndividual(customerId, shipmentId, CampaignType.ArrivalPhotos);

    [HttpGet("api/whatsapp/campaigns")] public async Task<IActionResult> Campaigns() => Ok(await db.WhatsAppCampaigns.OrderByDescending(x=>x.CreatedAt).Select(x=> new { x.Id, x.Type, x.ShipmentId, x.CreatedAt, x.RecipientCount, x.Completed }).ToListAsync());
    [HttpGet("api/whatsapp/campaigns/{id:int}")] public async Task<IActionResult> Campaign(int id) => Ok(await db.WhatsAppDeliveryLogs.Where(x=>x.CampaignId==id).Select(x=> new { x.Id, x.CampaignId, x.CustomerId, x.Phone, x.Result, x.FailureReason, x.SentAt }).ToListAsync());

    private async Task<IActionResult> SendBulk(int shipmentId, CampaignType type)
    {
        var customers = await db.Packages.Include(x=>x.Customer).ThenInclude(x=>x.WhatsAppConsent).Where(x => x.ShipmentId == shipmentId).Select(x => x.Customer).Distinct().ToListAsync();
        var camp = new WhatsAppCampaign { ShipmentId = shipmentId, Type = type, TriggeredByAdminUserId = 1, RecipientCount = customers.Count };
        db.WhatsAppCampaigns.Add(camp); await db.SaveChangesAsync();
        foreach (var c in customers) await TrySend(camp.Id, c, shipmentId, type);
        camp.Completed = true; await db.SaveChangesAsync();
        return Ok(camp);
    }

    private async Task<IActionResult> SendIndividual(int customerId, int shipmentId, CampaignType type)
    {
        var camp = new WhatsAppCampaign { ShipmentId = shipmentId, Type = type, TriggeredByAdminUserId = 1, RecipientCount = 1 };
        db.WhatsAppCampaigns.Add(camp); await db.SaveChangesAsync();
        var c = await db.Customers.Include(x=>x.WhatsAppConsent).FirstAsync(x=>x.Id==customerId);
        await TrySend(camp.Id, c, shipmentId, type); camp.Completed = true; await db.SaveChangesAsync(); return Ok(camp);
    }

    private async Task TrySend(int campaignId, Customer c, int shipmentId, CampaignType type)
    {
        var consent = c.WhatsAppConsent;
        var optIn = type switch { CampaignType.StatusUpdate => consent?.OptInStatusUpdates ?? false, CampaignType.DeparturePhotos => consent?.OptInDeparturePhotos ?? false, _ => consent?.OptInArrivalPhotos ?? false };
        if (!optIn)
        {
            db.WhatsAppDeliveryLogs.Add(new WhatsAppDeliveryLog { CampaignId = campaignId, CustomerId = c.Id, Phone = c.PrimaryPhone, Result = DeliveryResult.SkippedNoOptIn, FailureReason = "Not opted in" });
            await db.SaveChangesAsync(); return;
        }
        var media = type == CampaignType.StatusUpdate ? [] : await db.Media.Where(x => x.Package.ShipmentId == shipmentId && x.Package.CustomerId == c.Id && x.Stage == (type == CampaignType.DeparturePhotos ? MediaStage.Departure : MediaStage.Arrival)).Select(x => x.PublicUrl).ToListAsync();
        var (ok, err) = await sender.SendAsync(c.PrimaryPhone, $"Shipment update ({type})", media);
        db.WhatsAppDeliveryLogs.Add(new WhatsAppDeliveryLog { CampaignId = campaignId, CustomerId = c.Id, Phone = c.PrimaryPhone, Result = ok ? DeliveryResult.Sent : DeliveryResult.Failed, FailureReason = err, SentAt = ok ? DateTime.UtcNow : null });
        await db.SaveChangesAsync();
    }
}
