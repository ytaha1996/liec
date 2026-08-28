using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Email, string Role, bool Active, string Username);
public record GateFailure(string Code, string Message, List<MissingGateItem> Missing);
public record MissingGateItem(int PackageId, string CustomerName, MediaStage Stage);
public record ExportRequest(string Format);

public record UpdateShipmentRequest(string? TiiuCode, DateTime? PlannedDepartureDate, DateTime? PlannedArrivalDate, decimal? MaxWeightKg = null, decimal? MaxCbm = null);

public record BulkTransitionRequest(int[] PackageIds, string Action);
public record BulkTransitionError(int PackageId, string Reason);
public record MovePackagesRequest(int[] PackageIds);

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);

// ── Reporting ───────────────────────────────────────────────────────────────

/// <summary>Filters shared by the report catalogue; each report declares which it honours.</summary>
public record ReportFilter(
    DateTime? From = null,
    DateTime? To = null,
    int? CustomerId = null,
    int? ShipmentId = null,
    PackageStatus? Status = null,
    ShipmentStatus? ShipmentStatus = null,
    int? OriginWarehouseId = null,
    int? DestinationWarehouseId = null,
    int? Limit = null);

/// <summary>Column types the report renderer understands: Text, Number, Decimal3, Currency.</summary>
public record ReportColumn(string Key, string Label, string Type);

/// <summary>A report as advertised in the catalogue, with the filters it supports.</summary>
public record ReportDefinitionDto(string Key, string Title, string Description, string[] Filters);

/// <summary>
/// One report run. Rows are loose dictionaries keyed by column so the page (and the
/// Excel writer) can render any report without knowing its shape.
/// </summary>
public record ReportResultDto(
    string Key,
    string Title,
    string Currency,
    List<ReportColumn> Columns,
    List<Dictionary<string, object?>> Rows,
    Dictionary<string, object?> Totals);
