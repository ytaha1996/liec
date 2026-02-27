using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Business;

public interface IWhatsAppBusiness
{
    Task<object> SendBulkAsync(int shipmentId, CampaignType type);
    Task<object> SendIndividualAsync(int customerId, int shipmentId, CampaignType type);
    Task<List<object>> CampaignsAsync();
    Task<List<object>> CampaignAsync(int id);
}

public class WhatsAppBusiness(AppDbContext db, IWhatsAppSender sender) : IWhatsAppBusiness
{
    public async Task<object> SendBulkAsync(int shipmentId, CampaignType type)
    {
        var customers = await db.Packages.Include(x => x.Customer).ThenInclude(x => x.WhatsAppConsent).Where(x => x.ShipmentId == shipmentId).Select(x => x.Customer).Distinct().ToListAsync();
        var camp = new WhatsAppCampaign { ShipmentId = shipmentId, Type = type, TriggeredByAdminUserId = 1, RecipientCount = customers.Count };
        db.WhatsAppCampaigns.Add(camp); await db.SaveChangesAsync();
        foreach (var c in customers) await TrySend(camp.Id, c, shipmentId, type);
        camp.Completed = true; await db.SaveChangesAsync();
        return new { camp.Id, camp.Type, camp.ShipmentId, camp.CreatedAt, camp.RecipientCount, camp.Completed };
    }

    public async Task<object> SendIndividualAsync(int customerId, int shipmentId, CampaignType type)
    {
        var camp = new WhatsAppCampaign { ShipmentId = shipmentId, Type = type, TriggeredByAdminUserId = 1, RecipientCount = 1 };
        db.WhatsAppCampaigns.Add(camp); await db.SaveChangesAsync();
        var c = await db.Customers.Include(x => x.WhatsAppConsent).FirstAsync(x => x.Id == customerId);
        await TrySend(camp.Id, c, shipmentId, type); camp.Completed = true; await db.SaveChangesAsync();
        return new { camp.Id, camp.Type, camp.ShipmentId, camp.CreatedAt, camp.RecipientCount, camp.Completed };
    }

    public async Task<List<object>> CampaignsAsync() => await db.WhatsAppCampaigns.OrderByDescending(x => x.CreatedAt).Select(x => (object)new { x.Id, x.Type, x.ShipmentId, x.CreatedAt, x.RecipientCount, x.Completed }).ToListAsync();
    public async Task<List<object>> CampaignAsync(int id) => await db.WhatsAppDeliveryLogs.Where(x => x.CampaignId == id).Select(x => (object)new { x.Id, x.CampaignId, x.CustomerId, x.Phone, x.Result, x.FailureReason, x.SentAt }).ToListAsync();

    private async Task TrySend(int campaignId, Customer c, int shipmentId, CampaignType type)
    {
        var consent = c.WhatsAppConsent;
        var optIn = type switch { CampaignType.StatusUpdate => consent?.OptInStatusUpdates ?? false, CampaignType.DeparturePhotos => consent?.OptInDeparturePhotos ?? false, _ => consent?.OptInArrivalPhotos ?? false };
        if (!optIn)
        {
            db.WhatsAppDeliveryLogs.Add(new WhatsAppDeliveryLog { CampaignId = campaignId, CustomerId = c.Id, Phone = c.PrimaryPhone, Result = DeliveryResult.SkippedNoOptIn, FailureReason = "Not opted in" });
            await db.SaveChangesAsync(); return;
        }

        var media = type == CampaignType.StatusUpdate
            ? []
            : await db.Media.Where(x => x.Package.ShipmentId == shipmentId && x.Package.CustomerId == c.Id && x.Stage == (type == CampaignType.DeparturePhotos ? MediaStage.Departure : MediaStage.Arrival)).Select(x => x.PublicUrl).ToListAsync();

        var (ok, err) = await sender.SendAsync(c.PrimaryPhone, $"Shipment update ({type})", media);
        db.WhatsAppDeliveryLogs.Add(new WhatsAppDeliveryLog { CampaignId = campaignId, CustomerId = c.Id, Phone = c.PrimaryPhone, Result = ok ? DeliveryResult.Sent : DeliveryResult.Failed, FailureReason = err, SentAt = ok ? DateTime.UtcNow : null });
        await db.SaveChangesAsync();
    }
}

public interface IExportBusiness
{
    Task<object> GroupHelperAsync(string format);
    Task<object> ShipmentBolReportAsync(int shipmentId);
    Task<object> ShipmentCustomerInvoicesExcelAsync(int shipmentId);
}

public class ExportBusiness(IExportService exports) : IExportBusiness
{
    public async Task<object> GroupHelperAsync(string format)
    {
        var url = await exports.GenerateGroupHelperAsync(format);
        return new { publicUrl = url, warning = "WhatsApp groups reveal phone numbers to all members." };
    }

    public async Task<object> ShipmentBolReportAsync(int shipmentId)
    {
        var url = await exports.GenerateShipmentBolReportAsync(shipmentId);
        return new { publicUrl = url };
    }

    public async Task<object> ShipmentCustomerInvoicesExcelAsync(int shipmentId)
    {
        var url = await exports.GenerateShipmentCustomerInvoicesExcelAsync(shipmentId);
        return new { publicUrl = url };
    }
}
