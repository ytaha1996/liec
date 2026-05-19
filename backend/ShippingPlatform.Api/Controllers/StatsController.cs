using Microsoft.AspNetCore.Authorization;
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
        var shipments = await db.Shipments.ToListAsync();
        var packages = await db.Packages.ToListAsync();

        var shipmentsByStatus = shipments.GroupBy(x => x.Status.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var packagesByStatus = packages.GroupBy(x => x.Status.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var packagesMissingDeparturePhotos = packages
            .Count(x => !x.HasDeparturePhotos && x.Status != PackageStatus.Cancelled && x.Status != PackageStatus.Draft);

        var packagesMissingArrivalPhotos = packages
            .Count(x => !x.HasArrivalPhotos && x.Status >= PackageStatus.Shipped && x.Status != PackageStatus.Cancelled);

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var shipmentsThisMonth = shipments.Count(x => x.CreatedAt >= monthStart);

        var activeStatuses = new[] { PackageStatus.Draft, PackageStatus.Received, PackageStatus.Packed, PackageStatus.ReadyToShip, PackageStatus.Shipped, PackageStatus.ArrivedAtDestination, PackageStatus.ReadyForHandout };
        var totalPendingCharges = packages
            .Where(x => activeStatuses.Contains(x.Status))
            .Sum(x => x.ChargeAmount);

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
