using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

public record CustomerDto(int Id, string Name, string PrimaryPhone, string? Email, bool IsActive, WhatsAppConsentDto? WhatsAppConsent);
public record CreateCustomerRequest(string Name, string PrimaryPhone, string? Email, bool IsActive = true);
public record UpdateCustomerRequest(string Name, string PrimaryPhone, string? Email, bool IsActive);
public record WhatsAppConsentDto(bool OptInStatusUpdates, bool OptInDeparturePhotos, bool OptInArrivalPhotos, DateTime? OptedOutAt);

public record WarehouseDto(int Id, string Code, string Name, string City, string Country, decimal MaxWeightKg, decimal MaxCbm, bool IsActive);
public record UpsertWarehouseRequest(string Code, string Name, string City, string Country, decimal MaxWeightKg, decimal MaxCbm, bool IsActive = true);

public record GoodTypeDto(int Id, string NameEn, string NameAr, bool CanBreak, bool CanBurn, bool IsActive);
public record UpsertGoodTypeRequest(string NameEn, string NameAr, bool CanBreak, bool CanBurn, bool IsActive = true);

public record SupplierDto(int Id, string Name, string? Email, bool IsActive);
public record UpsertSupplierRequest(string Name, string? Email, bool IsActive = true);

public record SupplyOrderDto(int Id, int CustomerId, int SupplierId, int? PackageId, string Name, decimal PurchasePrice, string? Details, SupplyOrderStatus Status, string? CancelReason);
public record UpsertSupplyOrderRequest(int CustomerId, int SupplierId, int? PackageId, string Name, decimal PurchasePrice, string? Details);
public record SupplyOrderTransitionRequest(SupplyOrderStatus Status, string? CancelReason);

public record PricingConfigDto(int Id, string Name, string Currency, DateTime EffectiveFrom, DateTime? EffectiveTo, decimal DefaultRatePerKg, decimal DefaultRatePerCbm, PricingConfigStatus Status);
public record UpsertPricingConfigRequest(string Name, string Currency, DateTime EffectiveFrom, DateTime? EffectiveTo, decimal DefaultRatePerKg, decimal DefaultRatePerCbm, PricingConfigStatus Status);

public record ShipmentDto(int Id, string RefCode, string? TiiuCode, int OriginWarehouseId, int DestinationWarehouseId, DateTime PlannedDepartureDate, DateTime PlannedArrivalDate, DateTime? ActualDepartureAt, DateTime? ActualArrivalAt, ShipmentStatus Status, decimal MaxWeightKg, decimal MaxCbm, decimal TotalWeightKg, decimal TotalCbm, string? ExternalTrackingCode, string? ExternalCarrierName, string? ExternalOrigin, string? ExternalDestination, DateTime? ExternalEstimatedArrivalAt, string? ExternalStatus, DateTime? ExternalLastSyncedAt, DateTime CreatedAt);
public record CreateShipmentRequest(int OriginWarehouseId, int DestinationWarehouseId, DateTime PlannedDepartureDate, DateTime PlannedArrivalDate, decimal MaxWeightKg = 0, decimal MaxCbm = 0, string? TiiuCode = null);

public record PackageDto(int Id, int ShipmentId, int CustomerId, ProvisionMethod ProvisionMethod, PackageStatus Status, decimal WeightKg, decimal Cbm, string Currency, decimal AppliedRatePerKg, decimal AppliedRatePerCbm, decimal ChargeAmount, bool HasDeparturePhotos, bool HasArrivalPhotos, bool HasPricingOverride, int? SupplyOrderId, string? Note, DateTime CreatedAt);
public record CreatePackageRequest(int CustomerId, ProvisionMethod ProvisionMethod, int? SupplyOrderId, decimal? WeightKg = null, decimal? Cbm = null, string? Note = null, List<UpsertPackageItemRequest>? Items = null);
public record AutoAssignPackageRequest(int CustomerId, ProvisionMethod ProvisionMethod, int? SupplyOrderId, int OriginWarehouseId, int DestinationWarehouseId);
public record UpdatePackageRequest(decimal? WeightKg, decimal? Cbm, string? Note);
public record PackageItemDto(int Id, int PackageId, int GoodTypeId, string GoodTypeName, int Quantity, string? Note);
public record UpsertPackageItemRequest(int GoodTypeId, int Quantity = 1, string? Note = null);
public record ApplyPricingOverrideRequest(PricingOverrideType OverrideType, decimal NewValue, string Reason);
public record PricingOverrideDto(int Id, PricingOverrideType OverrideType, decimal OriginalValue, decimal NewValue, string Reason, DateTime CreatedAt);

public static class DtoMap
{
    public static CustomerDto ToDto(this Customer c) => new(c.Id, c.Name, c.PrimaryPhone, c.Email, c.IsActive, c.WhatsAppConsent is null ? null : new WhatsAppConsentDto(c.WhatsAppConsent.OptInStatusUpdates, c.WhatsAppConsent.OptInDeparturePhotos, c.WhatsAppConsent.OptInArrivalPhotos, c.WhatsAppConsent.OptedOutAt));
    public static WarehouseDto ToDto(this Warehouse x) => new(x.Id, x.Code, x.Name, x.City, x.Country, x.MaxWeightKg, x.MaxCbm, x.IsActive);
    public static GoodTypeDto ToDto(this GoodType x) => new(x.Id, x.NameEn, x.NameAr, x.CanBreak, x.CanBurn, x.IsActive);
    public static SupplierDto ToDto(this Supplier x) => new(x.Id, x.Name, x.Email, x.IsActive);
    public static SupplyOrderDto ToDto(this SupplyOrder x) => new(x.Id, x.CustomerId, x.SupplierId, x.PackageId, x.Name, x.PurchasePrice, x.Details, x.Status, x.CancelReason);
    public static PricingConfigDto ToDto(this PricingConfig x) => new(x.Id, x.Name, x.Currency, x.EffectiveFrom, x.EffectiveTo, x.DefaultRatePerKg, x.DefaultRatePerCbm, x.Status);
    public static ShipmentDto ToDto(this Shipment x) => new(x.Id, x.RefCode, x.TiiuCode, x.OriginWarehouseId, x.DestinationWarehouseId, x.PlannedDepartureDate, x.PlannedArrivalDate, x.ActualDepartureAt, x.ActualArrivalAt, x.Status, x.MaxWeightKg, x.MaxCbm, x.TotalWeightKg, x.TotalCbm, x.ExternalTrackingCode, x.ExternalCarrierName, x.ExternalOrigin, x.ExternalDestination, x.ExternalEstimatedArrivalAt, x.ExternalStatus, x.ExternalLastSyncedAt, x.CreatedAt);
    public static PackageDto ToDto(this Package x) => new(x.Id, x.ShipmentId, x.CustomerId, x.ProvisionMethod, x.Status, x.WeightKg, x.Cbm, x.Currency, x.AppliedRatePerKg, x.AppliedRatePerCbm, x.ChargeAmount, x.HasDeparturePhotos, x.HasArrivalPhotos, x.HasPricingOverride, x.SupplyOrderId, x.Note, x.CreatedAt);
    public static PackageItemDto ToDto(this PackageItem x) => new(x.Id, x.PackageId, x.GoodTypeId, x.GoodType?.NameEn ?? "", x.Quantity, x.Note);
}
