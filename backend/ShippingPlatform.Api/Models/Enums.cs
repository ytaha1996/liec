namespace ShippingPlatform.Api.Models;

public enum PricingConfigStatus { Draft, Scheduled, Active, Retired }
public enum ShipmentStatus { Draft, Pending, NearlyFull, Loaded, Shipped, Arrived, Completed, Closed, Cancelled }
public enum PricingOverrideType { RatePerKg, RatePerM3, TotalCharge }
public enum PackageStatus { Draft, Received, Packed, ReadyToShip, Shipped, ArrivedAtDestination, ReadyForHandout, HandedOut, Cancelled }
public enum SupplyOrderStatus { Draft, Approved, Ordered, DeliveredToWarehouse, PackedIntoPackage, Closed, Cancelled }
public enum ProvisionMethod { CustomerProvided, ProcuredForCustomer }
public enum MediaStage { Receiving, Departure, Arrival, Other }
public enum CampaignType { StatusUpdate, DeparturePhotos, ArrivalPhotos }
public enum DeliveryResult { Pending, Sent, Failed, SkippedNoOptIn }
