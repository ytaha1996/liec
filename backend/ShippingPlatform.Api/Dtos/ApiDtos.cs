using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

public record CustomerDto(int Id, string Name, string PrimaryPhone, string? Email, bool IsActive, WhatsAppConsentDto? WhatsAppConsent);
public record CreateCustomerRequest(string Name, string PrimaryPhone, string? Email, bool IsActive = true);
public record UpdateCustomerRequest(string Name, string PrimaryPhone, string? Email, bool IsActive);
public record WhatsAppConsentDto(bool OptInStatusUpdates, bool OptInDeparturePhotos, bool OptInArrivalPhotos, DateTime? OptedOutAt);

public record WarehouseDto(int Id, string Code, string Name, string City, string Country, decimal MaxWeightKg, decimal MaxVolumeM3, bool IsActive);
public record UpsertWarehouseRequest(string Code, string Name, string City, string Country, decimal MaxWeightKg, decimal MaxVolumeM3, bool IsActive = true);

public record GoodTypeDto(int Id, string NameEn, string NameAr, decimal? RatePerKg, decimal? RatePerM3, bool IsActive);
public record UpsertGoodTypeRequest(string NameEn, string NameAr, decimal? RatePerKg, decimal? RatePerM3, bool IsActive = true);

public record GoodDto(int Id, int GoodTypeId, string NameEn, string NameAr, bool CanBurn, bool CanBreak, string Unit, decimal? RatePerKgOverride, decimal? RatePerM3Override, bool IsActive);
public record UpsertGoodRequest(int GoodTypeId, string NameEn, string NameAr, bool CanBurn, bool CanBreak, string Unit, decimal? RatePerKgOverride, decimal? RatePerM3Override, bool IsActive = true);

public record SupplierDto(int Id, string Name, string? Email, bool IsActive);
public record UpsertSupplierRequest(string Name, string? Email, bool IsActive = true);

public record SupplyOrderDto(int Id, int CustomerId, int SupplierId, int? PackageId, string Name, decimal PurchasePrice, string? Details, SupplyOrderStatus Status, string? CancelReason);
public record UpsertSupplyOrderRequest(int CustomerId, int SupplierId, int? PackageId, string Name, decimal PurchasePrice, string? Details);
public record SupplyOrderTransitionRequest(SupplyOrderStatus Status, string? CancelReason);

public record PricingConfigDto(int Id, string Name, string Currency, DateTime EffectiveFrom, DateTime? EffectiveTo, decimal DefaultRatePerKg, decimal DefaultRatePerM3, PricingConfigStatus Status);
public record UpsertPricingConfigRequest(string Name, string Currency, DateTime EffectiveFrom, DateTime? EffectiveTo, decimal DefaultRatePerKg, decimal DefaultRatePerM3, PricingConfigStatus Status);

public record ShipmentDto(int Id, string RefCode, int OriginWarehouseId, int DestinationWarehouseId, DateTime PlannedDepartureDate, DateTime PlannedArrivalDate, DateTime? ActualDepartureAt, DateTime? ActualArrivalAt, ShipmentStatus Status, decimal MaxWeightKg, decimal MaxVolumeM3, decimal TotalWeightKg, decimal TotalVolumeM3, DateTime CreatedAt);
public record CreateShipmentRequest(int OriginWarehouseId, int DestinationWarehouseId, DateTime PlannedDepartureDate, DateTime PlannedArrivalDate, decimal MaxWeightKg = 0, decimal MaxVolumeM3 = 0);

public record PackageDto(int Id, int ShipmentId, int CustomerId, ProvisionMethod ProvisionMethod, PackageStatus Status, decimal TotalWeightKg, decimal TotalVolumeM3, string Currency, decimal AppliedRatePerKg, decimal AppliedRatePerM3, decimal ChargeAmount, bool HasDeparturePhotos, bool HasArrivalPhotos, bool HasPricingOverride, int? SupplyOrderId, DateTime CreatedAt);
public record CreatePackageRequest(int CustomerId, ProvisionMethod ProvisionMethod, int? SupplyOrderId);
public record PackageItemDto(int Id, int PackageId, int GoodId, int Quantity, decimal WeightKg, decimal VolumeM3, decimal LineCharge);
public record UpsertPackageItemRequest(int GoodId, int Quantity, decimal WeightKg, decimal VolumeM3);
public record ApplyPricingOverrideRequest(PricingOverrideType OverrideType, decimal NewValue, string Reason);
public record PricingOverrideDto(int Id, PricingOverrideType OverrideType, decimal OriginalValue, decimal NewValue, string Reason, DateTime CreatedAt);

public static class DtoMap
{
    public static CustomerDto ToDto(this Customer c) => new(c.Id, c.Name, c.PrimaryPhone, c.Email, c.IsActive, c.WhatsAppConsent is null ? null : new WhatsAppConsentDto(c.WhatsAppConsent.OptInStatusUpdates, c.WhatsAppConsent.OptInDeparturePhotos, c.WhatsAppConsent.OptInArrivalPhotos, c.WhatsAppConsent.OptedOutAt));
    public static WarehouseDto ToDto(this Warehouse x) => new(x.Id, x.Code, x.Name, x.City, x.Country, x.MaxWeightKg, x.MaxVolumeM3, x.IsActive);
    public static GoodTypeDto ToDto(this GoodType x) => new(x.Id, x.NameEn, x.NameAr, x.RatePerKg, x.RatePerM3, x.IsActive);
    public static GoodDto ToDto(this Good x) => new(x.Id, x.GoodTypeId, x.NameEn, x.NameAr, x.CanBurn, x.CanBreak, x.Unit, x.RatePerKgOverride, x.RatePerM3Override, x.IsActive);
    public static SupplierDto ToDto(this Supplier x) => new(x.Id, x.Name, x.Email, x.IsActive);
    public static SupplyOrderDto ToDto(this SupplyOrder x) => new(x.Id, x.CustomerId, x.SupplierId, x.PackageId, x.Name, x.PurchasePrice, x.Details, x.Status, x.CancelReason);
    public static PricingConfigDto ToDto(this PricingConfig x) => new(x.Id, x.Name, x.Currency, x.EffectiveFrom, x.EffectiveTo, x.DefaultRatePerKg, x.DefaultRatePerM3, x.Status);
    public static ShipmentDto ToDto(this Shipment x) => new(x.Id, x.RefCode, x.OriginWarehouseId, x.DestinationWarehouseId, x.PlannedDepartureDate, x.PlannedArrivalDate, x.ActualDepartureAt, x.ActualArrivalAt, x.Status, x.MaxWeightKg, x.MaxVolumeM3, x.TotalWeightKg, x.TotalVolumeM3, x.CreatedAt);
    public static PackageDto ToDto(this Package x) => new(x.Id, x.ShipmentId, x.CustomerId, x.ProvisionMethod, x.Status, x.TotalWeightKg, x.TotalVolumeM3, x.Currency, x.AppliedRatePerKg, x.AppliedRatePerM3, x.ChargeAmount, x.HasDeparturePhotos, x.HasArrivalPhotos, x.HasPricingOverride, x.SupplyOrderId, x.CreatedAt);
    public static PackageItemDto ToDto(this PackageItem x) => new(x.Id, x.PackageId, x.GoodId, x.Quantity, x.WeightKg, x.VolumeM3, x.LineCharge);
}
