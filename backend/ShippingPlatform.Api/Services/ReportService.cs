using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

public interface IReportService
{
    IReadOnlyList<ReportDefinitionDto> Catalogue { get; }
    Task<ReportResultDto?> RunAsync(string key, ReportFilter filter, CancellationToken ct = default);
}

/// <summary>
/// The report catalogue. Every report answers one business question and declares
/// its own columns, so the page and the Excel writer can render any of them
/// without bespoke code — adding a report is one builder plus a catalogue entry.
///
/// Aggregation stays in the database (the pattern StatsController.Overview uses)
/// so a wide date range never pulls the package table into memory. One hard
/// constraint: a Distinct().Count() nested inside a GroupBy projection cannot be
/// translated to SQL, so distinct counts come from their own small queries.
/// </summary>
public class ReportService(AppDbContext db) : IReportService
{
    // Column types understood by the frontend and the Excel writer.
    private const string Text = "Text";
    private const string Number = "Number";
    private const string Decimal3 = "Decimal3";
    private const string Currency = "Currency";

    private static readonly string[] PeriodAndRoute =
        ["from", "to", "originWarehouseId", "destinationWarehouseId"];

    public IReadOnlyList<ReportDefinitionDto> Catalogue { get; } =
    [
        new("customer-summary", "Customer Summary",
            "Every customer: shipments they appeared in, volume, weight and what they were billed.",
            [.. PeriodAndRoute, "customerId", "shipmentId"]),
        new("top-customers", "Top Customers by Rate",
            "Best-billing customers ranked, with revenue per CBM and per ton.",
            [.. PeriodAndRoute, "limit"]),
        new("revenue-by-month", "Revenue by Month",
            "How volume and billing move month to month.",
            [.. PeriodAndRoute, "customerId"]),
        new("container-utilisation", "Container Utilisation",
            "How full each container went against its limits, and what it carried.",
            [.. PeriodAndRoute, "shipmentStatus"]),
    ];

    public async Task<ReportResultDto?> RunAsync(string key, ReportFilter filter, CancellationToken ct = default)
    {
        var def = Catalogue.FirstOrDefault(d => d.Key == key);
        if (def is null) return null;

        var currency = await CurrencyAsync(filter, ct);
        return key switch
        {
            "customer-summary" => await CustomerSummaryAsync(def, filter, currency, ct),
            "top-customers" => await TopCustomersAsync(def, filter, currency, ct),
            "revenue-by-month" => await RevenueByMonthAsync(def, filter, currency, ct),
            "container-utilisation" => await ContainerUtilisationAsync(def, filter, currency, ct),
            _ => null,
        };
    }

    /// <summary>Packages in scope: cancelled cargo never counts towards billing.</summary>
    private IQueryable<Package> Scope(ReportFilter f)
    {
        var q = db.Packages.Where(p => p.Status != PackageStatus.Cancelled);

        // Dates filter on planned departure — the date the business thinks of as
        // "when the container went".
        if (f.From is { } from) q = q.Where(p => p.Shipment.PlannedDepartureDate >= from);
        if (f.To is { } to) q = q.Where(p => p.Shipment.PlannedDepartureDate <= to);
        if (f.CustomerId is { } cid) q = q.Where(p => p.CustomerId == cid);
        if (f.ShipmentId is { } sid) q = q.Where(p => p.ShipmentId == sid);
        if (f.Status is { } st) q = q.Where(p => p.Status == st);
        if (f.ShipmentStatus is { } sst) q = q.Where(p => p.Shipment.Status == sst);
        if (f.OriginWarehouseId is { } owh) q = q.Where(p => p.Shipment.OriginWarehouseId == owh);
        if (f.DestinationWarehouseId is { } dwh) q = q.Where(p => p.Shipment.DestinationWarehouseId == dwh);
        return q;
    }

    private async Task<string> CurrencyAsync(ReportFilter f, CancellationToken ct)
        => await Scope(f).Select(p => p.Currency).FirstOrDefaultAsync(ct) ?? "XAF";

    private static Dictionary<string, object?> Row(params (string Key, object? Value)[] cells)
        => cells.ToDictionary(c => c.Key, c => c.Value);

    private static decimal Round3(decimal v) => decimal.Round(v, 3);

    private static async Task<int> DistinctShipmentsAsync(IQueryable<Package> q, CancellationToken ct)
        => await q.Select(p => p.ShipmentId).Distinct().CountAsync(ct);

    // ── Customer Summary ────────────────────────────────────────────────────
    private async Task<ReportResultDto> CustomerSummaryAsync(
        ReportDefinitionDto def, ReportFilter f, string currency, CancellationToken ct)
    {
        var q = Scope(f);

        var grouped = await q.GroupBy(p => new { p.CustomerId, p.Customer.Name })
            .Select(g => new
            {
                g.Key.CustomerId,
                g.Key.Name,
                Packages = g.Count(),
                Cbm = g.Sum(x => x.Cbm),
                WeightKg = g.Sum(x => x.WeightKg),
                Freight = g.Sum(x => x.ChargeAmount),
                Fees = g.Sum(x => x.FeeAmount),
                Discounts = g.Sum(x => x.DiscountAmount),
            })
            .ToListAsync(ct);

        // "How many shipments was this customer in" — a distinct count, which has
        // to live outside the group projection.
        var shipmentsPerCustomer = (await q.Select(p => new { p.CustomerId, p.ShipmentId }).Distinct().ToListAsync(ct))
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Count());

        var rows = grouped
            .Select(g => new
            {
                g.CustomerId,
                g.Name,
                Shipments = shipmentsPerCustomer.TryGetValue(g.CustomerId, out var n) ? n : 0,
                g.Packages,
                g.Cbm,
                g.WeightKg,
                g.Freight,
                g.Fees,
                g.Discounts,
                Net = g.Freight + g.Fees - g.Discounts,
            })
            .OrderByDescending(g => g.Net)
            .ToList();

        return new ReportResultDto(def.Key, def.Title, currency,
            [
                new("customer", "Customer", Text),
                new("shipments", "Shipments", Number),
                new("packages", "Packages", Number),
                new("cbm", "CBM", Decimal3),
                new("weightTons", "Weight (t)", Decimal3),
                new("freight", "Freight", Currency),
                new("fees", "Fees", Currency),
                new("discounts", "Discounts", Currency),
                new("totalBilled", "Total Billed", Currency),
            ],
            [.. rows.Select(r => Row(
                ("id", r.CustomerId),
                ("customer", $"{r.Name} (#{r.CustomerId})"),
                ("shipments", r.Shipments),
                ("packages", r.Packages),
                ("cbm", Round3(r.Cbm)),
                ("weightTons", Round3(r.WeightKg / 1000m)),
                ("freight", r.Freight),
                ("fees", r.Fees),
                ("discounts", r.Discounts),
                ("totalBilled", r.Net)))],
            Row(
                ("customers", rows.Count),
                ("shipments", await DistinctShipmentsAsync(q, ct)),
                ("packages", rows.Sum(r => r.Packages)),
                ("cbm", Round3(rows.Sum(r => r.Cbm))),
                ("weightTons", Round3(rows.Sum(r => r.WeightKg) / 1000m)),
                ("freight", rows.Sum(r => r.Freight)),
                ("fees", rows.Sum(r => r.Fees)),
                ("discounts", rows.Sum(r => r.Discounts)),
                ("totalBilled", rows.Sum(r => r.Net))));
    }

    // ── Top Customers by Rate ───────────────────────────────────────────────
    private async Task<ReportResultDto> TopCustomersAsync(
        ReportDefinitionDto def, ReportFilter f, string currency, CancellationToken ct)
    {
        var q = Scope(f);
        var limit = f.Limit is > 0 ? f.Limit.Value : 15;

        var grouped = await q.GroupBy(p => new { p.CustomerId, p.Customer.Name })
            .Select(g => new
            {
                g.Key.CustomerId,
                g.Key.Name,
                Packages = g.Count(),
                Cbm = g.Sum(x => x.Cbm),
                WeightKg = g.Sum(x => x.WeightKg),
                Net = g.Sum(x => x.ChargeAmount + x.FeeAmount - x.DiscountAmount),
            })
            .ToListAsync(ct);

        var shipmentsPerCustomer = (await q.Select(p => new { p.CustomerId, p.ShipmentId }).Distinct().ToListAsync(ct))
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Count());

        var ranked = grouped.OrderByDescending(g => g.Net).Take(limit).ToList();

        return new ReportResultDto(def.Key, def.Title, currency,
            [
                new("rank", "Rank", Number),
                new("customer", "Customer", Text),
                new("shipments", "Shipments", Number),
                new("packages", "Packages", Number),
                new("cbm", "CBM", Decimal3),
                new("weightTons", "Weight (t)", Decimal3),
                new("totalBilled", "Total Billed", Currency),
                new("perCbm", "Per CBM", Currency),
                new("perTon", "Per Ton", Currency),
            ],
            [.. ranked.Select((r, i) => Row(
                ("id", r.CustomerId),
                ("rank", i + 1),
                ("customer", $"{r.Name} (#{r.CustomerId})"),
                ("shipments", shipmentsPerCustomer.TryGetValue(r.CustomerId, out var n) ? n : 0),
                ("packages", r.Packages),
                ("cbm", Round3(r.Cbm)),
                ("weightTons", Round3(r.WeightKg / 1000m)),
                ("totalBilled", r.Net),
                // Zero-measure cargo would divide by zero — report nothing rather
                // than an infinite rate.
                ("perCbm", r.Cbm > 0 ? decimal.Round(r.Net / r.Cbm, 2) : (decimal?)null),
                ("perTon", r.WeightKg > 0 ? decimal.Round(r.Net / (r.WeightKg / 1000m), 2) : (decimal?)null)))],
            Row(
                ("customers", ranked.Count),
                ("packages", ranked.Sum(r => r.Packages)),
                ("cbm", Round3(ranked.Sum(r => r.Cbm))),
                ("weightTons", Round3(ranked.Sum(r => r.WeightKg) / 1000m)),
                ("totalBilled", ranked.Sum(r => r.Net))));
    }

    // ── Revenue by Month ────────────────────────────────────────────────────
    private async Task<ReportResultDto> RevenueByMonthAsync(
        ReportDefinitionDto def, ReportFilter f, string currency, CancellationToken ct)
    {
        var q = Scope(f);

        var grouped = await q
            .GroupBy(p => new { p.Shipment.PlannedDepartureDate.Year, p.Shipment.PlannedDepartureDate.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Packages = g.Count(),
                Cbm = g.Sum(x => x.Cbm),
                WeightKg = g.Sum(x => x.WeightKg),
                Freight = g.Sum(x => x.ChargeAmount),
                Fees = g.Sum(x => x.FeeAmount),
                Discounts = g.Sum(x => x.DiscountAmount),
            })
            .ToListAsync(ct);

        var shipmentMonths = await q
            .Select(p => new { p.ShipmentId, p.Shipment.PlannedDepartureDate.Year, p.Shipment.PlannedDepartureDate.Month })
            .Distinct()
            .ToListAsync(ct);
        var shipmentsPerMonth = shipmentMonths
            .GroupBy(x => (x.Year, x.Month))
            .ToDictionary(g => g.Key, g => g.Count());

        var rows = grouped
            .OrderBy(g => g.Year).ThenBy(g => g.Month)
            .Select(g => new
            {
                g.Year,
                g.Month,
                Shipments = shipmentsPerMonth.TryGetValue((g.Year, g.Month), out var n) ? n : 0,
                g.Packages,
                g.Cbm,
                g.WeightKg,
                g.Freight,
                g.Fees,
                g.Discounts,
                Net = g.Freight + g.Fees - g.Discounts,
            })
            .ToList();

        return new ReportResultDto(def.Key, def.Title, currency,
            [
                new("month", "Month", Text),
                new("shipments", "Shipments", Number),
                new("packages", "Packages", Number),
                new("cbm", "CBM", Decimal3),
                new("weightTons", "Weight (t)", Decimal3),
                new("freight", "Freight", Currency),
                new("fees", "Fees", Currency),
                new("discounts", "Discounts", Currency),
                new("totalBilled", "Total Billed", Currency),
            ],
            [.. rows.Select(r => Row(
                ("id", r.Year * 100 + r.Month),
                ("month", $"{r.Year}-{r.Month:D2}"),
                ("shipments", r.Shipments),
                ("packages", r.Packages),
                ("cbm", Round3(r.Cbm)),
                ("weightTons", Round3(r.WeightKg / 1000m)),
                ("freight", r.Freight),
                ("fees", r.Fees),
                ("discounts", r.Discounts),
                ("totalBilled", r.Net)))],
            Row(
                ("months", rows.Count),
                ("shipments", await DistinctShipmentsAsync(q, ct)),
                ("packages", rows.Sum(r => r.Packages)),
                ("cbm", Round3(rows.Sum(r => r.Cbm))),
                ("weightTons", Round3(rows.Sum(r => r.WeightKg) / 1000m)),
                ("freight", rows.Sum(r => r.Freight)),
                ("fees", rows.Sum(r => r.Fees)),
                ("discounts", rows.Sum(r => r.Discounts)),
                ("totalBilled", rows.Sum(r => r.Net))));
    }

    // ── Container Utilisation ───────────────────────────────────────────────
    private async Task<ReportResultDto> ContainerUtilisationAsync(
        ReportDefinitionDto def, ReportFilter f, string currency, CancellationToken ct)
    {
        var q = Scope(f);

        var grouped = await q
            .GroupBy(p => new
            {
                p.ShipmentId,
                p.Shipment.RefCode,
                p.Shipment.Status,
                p.Shipment.MaxCbm,
                p.Shipment.MaxWeightKg,
                Origin = p.Shipment.OriginWarehouse.Code,
                Destination = p.Shipment.DestinationWarehouse.Code,
            })
            .Select(g => new
            {
                g.Key.ShipmentId,
                g.Key.RefCode,
                g.Key.Status,
                g.Key.MaxCbm,
                g.Key.MaxWeightKg,
                g.Key.Origin,
                g.Key.Destination,
                Packages = g.Count(),
                Cbm = g.Sum(x => x.Cbm),
                WeightKg = g.Sum(x => x.WeightKg),
                Net = g.Sum(x => x.ChargeAmount + x.FeeAmount - x.DiscountAmount),
            })
            .ToListAsync(ct);

        var customersPerShipment = (await q.Select(p => new { p.ShipmentId, p.CustomerId }).Distinct().ToListAsync(ct))
            .GroupBy(x => x.ShipmentId)
            .ToDictionary(g => g.Key, g => g.Count());

        var rows = grouped.OrderByDescending(g => g.ShipmentId).ToList();

        // Null percent when the container carries no configured maximum, so the
        // page can show a dash instead of a misleading 0%.
        static decimal? Pct(decimal used, decimal max) => max > 0 ? decimal.Round(used / max * 100m, 1) : null;

        return new ReportResultDto(def.Key, def.Title, currency,
            [
                new("shipment", "Shipment", Text),
                new("route", "Route", Text),
                new("status", "Status", Text),
                new("customers", "Customers", Number),
                new("packages", "Packages", Number),
                new("cbm", "CBM Used", Decimal3),
                new("maxCbm", "CBM Max", Decimal3),
                new("cbmPct", "% Full (CBM)", Number),
                new("weightTons", "Weight (t)", Decimal3),
                new("maxWeightTons", "Weight Max (t)", Decimal3),
                new("weightPct", "% Full (Weight)", Number),
                new("totalBilled", "Total Billed", Currency),
            ],
            [.. rows.Select(r => Row(
                ("id", r.ShipmentId),
                ("shipment", r.RefCode),
                ("route", $"{r.Origin} → {r.Destination}"),
                ("status", r.Status.ToString()),
                ("customers", customersPerShipment.TryGetValue(r.ShipmentId, out var n) ? n : 0),
                ("packages", r.Packages),
                ("cbm", Round3(r.Cbm)),
                ("maxCbm", Round3(r.MaxCbm)),
                ("cbmPct", Pct(r.Cbm, r.MaxCbm)),
                ("weightTons", Round3(r.WeightKg / 1000m)),
                ("maxWeightTons", Round3(r.MaxWeightKg / 1000m)),
                ("weightPct", Pct(r.WeightKg, r.MaxWeightKg)),
                ("totalBilled", r.Net)))],
            Row(
                ("shipments", rows.Count),
                ("packages", rows.Sum(r => r.Packages)),
                ("cbm", Round3(rows.Sum(r => r.Cbm))),
                ("weightTons", Round3(rows.Sum(r => r.WeightKg) / 1000m)),
                ("totalBilled", rows.Sum(r => r.Net))));
    }
}
