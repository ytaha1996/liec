using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController(AppDbContext db) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        // All aggregation happens DB-side — no table scans into memory.
        var shipmentsByStatus = (await db.Shipments
                .GroupBy(x => x.Status)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync())
            .ToDictionary(g => g.Key.ToString(), g => g.Count);

        var packagesByStatus = (await db.Packages
                .GroupBy(x => x.Status)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync())
            .ToDictionary(g => g.Key.ToString(), g => g.Count);

        var packagesMissingDeparturePhotos = await db.Packages.CountAsync(x =>
            !x.HasDeparturePhotos && x.Status != PackageStatus.Cancelled && x.Status != PackageStatus.Draft);

        var packagesMissingArrivalPhotos = await db.Packages.CountAsync(x =>
            !x.HasArrivalPhotos && x.Status >= PackageStatus.Shipped && x.Status != PackageStatus.Cancelled);

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var shipmentsThisMonth = await db.Shipments.CountAsync(x => x.CreatedAt >= monthStart);

        // Financial aggregate is not for warehouse staff — Field gets the
        // operational stats but no company-wide charge totals.
        decimal? totalPendingCharges = null;
        if (!User.IsInRole("Field"))
        {
            var activeStatuses = new[]
            {
                PackageStatus.Draft, PackageStatus.Received, PackageStatus.Packed,
                PackageStatus.ReadyToShip, PackageStatus.Shipped,
                PackageStatus.ArrivedAtDestination, PackageStatus.ReadyForHandout,
            };
            totalPendingCharges = await db.Packages
                .Where(x => activeStatuses.Contains(x.Status))
                .SumAsync(x => (decimal?)x.ChargeAmount) ?? 0;
        }

        var totalCustomers = await db.Customers.CountAsync(x => x.IsActive);

        return Ok(new
        {
            totalCustomers,
            shipmentsByStatus,
            packagesByStatus,
            packagesMissingDeparturePhotos,
            packagesMissingArrivalPhotos,
            shipmentsThisMonth,
            totalPendingCharges,
        });
    }
}
