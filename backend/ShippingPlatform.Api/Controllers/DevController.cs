using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/dev")]
[Authorize(Roles = "Admin")]
public class DevController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("reset-data")]
    public async Task<IActionResult> ResetData()
    {
        if (!env.IsDevelopment()) return NotFound();

        // Currencies are part of the seeded master data — preserve them
        db.WhatsAppDeliveryLogs.RemoveRange(db.WhatsAppDeliveryLogs);
        db.WhatsAppCampaigns.RemoveRange(db.WhatsAppCampaigns);
        db.PricingOverrides.RemoveRange(db.PricingOverrides);
        db.Media.RemoveRange(db.Media);
        db.PackageItems.RemoveRange(db.PackageItems);
        db.SupplyOrders.RemoveRange(db.SupplyOrders);
        db.Packages.RemoveRange(db.Packages);
        db.Shipments.RemoveRange(db.Shipments);
        db.ShipmentSequences.RemoveRange(db.ShipmentSequences);
        db.Suppliers.RemoveRange(db.Suppliers);
        db.AuditLogs.RemoveRange(db.AuditLogs);
        db.WhatsAppConsents.RemoveRange(db.WhatsAppConsents);
        db.Customers.RemoveRange(db.Customers);
        await db.SaveChangesAsync();

        SeedHelper.SeedCustomers(db);
        SeedHelper.SeedCurrencies(db);

        return NoContent();
    }
}
