using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Email);
public record GateFailure(string Code, string Message, List<MissingGateItem> Missing);
public record MissingGateItem(int PackageId, string CustomerName, MediaStage Stage);
public record StatusRequest(string Status);
public record ExportRequest(string Format);

public record ShipmentTrackingSyncRequest(string Code);
public record UpdateShipmentRequest(string? TiiuCode, DateTime? PlannedDepartureDate, DateTime? PlannedArrivalDate);
