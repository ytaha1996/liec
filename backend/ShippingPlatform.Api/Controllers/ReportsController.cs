using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/reports")]
// Company-wide billing figures — Field is excluded for the same reason
// StatsController withholds totalPendingCharges from warehouse staff.
[Authorize(Roles = "Admin,Manager,Accountant")]
public class ReportsController(IReportService reports) : ControllerBase
{
    /// <summary>The report catalogue, so the page never hardcodes the list.</summary>
    [HttpGet]
    public IActionResult Catalogue() => Ok(reports.Catalogue);

    [HttpGet("{key}")]
    public async Task<IActionResult> Run(
        string key,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? customerId,
        [FromQuery] int? shipmentId,
        [FromQuery] PackageStatus? status,
        [FromQuery] ShipmentStatus? shipmentStatus,
        [FromQuery] int? originWarehouseId,
        [FromQuery] int? destinationWarehouseId,
        [FromQuery] int? limit,
        CancellationToken ct = default)
    {
        var filter = new ReportFilter(from, to, customerId, shipmentId, status, shipmentStatus,
            originWarehouseId, destinationWarehouseId, limit);
        var result = await reports.RunAsync(key, filter, ct);
        return result is null
            ? NotFound(new { code = "NOT_FOUND", message = $"No report named '{key}'." })
            : Ok(result);
    }
}
