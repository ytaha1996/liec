# Shipping Platform — Admin-only (Business + Build Spec)

Repo layout:
- /backend  (ASP.NET Core Web API + EF Core + MySQL)
- /frontend (React + TypeScript + Material UI)

Only AdminUser can log in.

## NON-NEGOTIABLE BUSINESS RULES
1) Shipments are Warehouse -> Warehouse (one leg).
2) Package belongs to exactly ONE Shipment. Packages cannot travel across multiple shipments.
3) Receiving source is ALWAYS the Customer (even if goods were procured from a supplier).
4) Mandatory photo gates:
   - Shipment cannot be set to "Departed" unless EVERY package has >= 1 DEPARTURE photo.
   - Package cannot be set to "HandedOut" unless it has >= 1 ARRIVAL photo.
   - Shipment cannot be set to "Closed" unless ALL packages have ARRIVAL photos and are finalized.
5) Pricing:
   - Charge = max( totalWeightKg * ratePerKg, totalVolumeM3 * ratePerM3 )
   - Rate resolution priority:
     (a) Good overrides
     (b) GoodType rates
     (c) Active PricingConfig defaults
   - Pricing must be snapshotted at Pack (or ReadyToShip) and never changes after Shipped.
6) Shipment RefCode:
   - RefCode = OriginWarehouseCode + "-" + YY + sequenceWithinYear
   - Example: BER-2601 is first shipment from BER in 2026.
   - Sequence resets per origin warehouse each calendar year.
7) WhatsApp:
   - Bulk 1:1 messaging to customer PrimaryPhone.
   - Send shipment status updates (bulk and individual).
   - Send departure photos (bulk and individual).
   - Send arrival photos (bulk and individual).
   - Log campaign + per-customer delivery status.
   - "Group with all customers" is NOT automated: implement Group Helper export (CSV/VCF) + instructions.
8) Storage:
   - ALL photos and future exports (Excel/reports) stored in Azure Blob Storage as PUBLIC URLs (no SAS).
   - Backend stores BlobKey + PublicUrl.

## ENTITIES (BUSINESS-LEVEL)
- AdminUser: Id, Email, PasswordHash, IsActive, LastLoginAt.
- Customer: Id, CustomerRef(unique immutable), Name, PrimaryPhone, Email?, IsActive, WhatsAppConsent.
- WhatsAppConsent: CustomerId, OptInStatusUpdates, OptInDeparturePhotos, OptInArrivalPhotos, OptedOutAt?.
- Warehouse: Id, Code(3 chars like BER), Name, City, Country, MaxWeightKg, MaxVolumeM3, IsActive.
- PricingConfig: Id, Name, Currency, EffectiveFrom/To, DefaultRatePerKg, DefaultRatePerM3, Status(Draft/Scheduled/Active/Retired).
- GoodType: Id, NameEn, NameAr, RatePerKg?, RatePerM3?, IsActive.
- Good: Id, GoodTypeId, NameEn, NameAr, CanBurn, CanBreak, Unit(Box/CRT/PC/BAG/Pallete), RatePerKgOverride?, RatePerM3Override?, IsActive.
- Shipment: Id, RefCode, OriginWarehouseId, DestinationWarehouseId, PlannedDepartureDate, PlannedArrivalDate, ActualDepartureAt?, ActualArrivalAt?, Status, CreatedAt.
- ShipmentSequence: OriginWarehouseCode, Year, LastNumber (for RefCode generation).
- Package: Id, ShipmentId, CustomerId, ProvisionMethod(CustomerProvided/ProcuredForCustomer), Status,
           TotalWeightKg, TotalVolumeM3, Currency, AppliedRatePerKg, AppliedRatePerM3, ChargeAmount,
           HasDeparturePhotos, HasArrivalPhotos, SupplyOrderId?, CreatedAt.
- PackageItem: PackageId, GoodId, Quantity, WeightKg, VolumeM3, LineCharge (snapshot).
- Supplier: Id, Name, Email, IsActive.
- SupplyOrder: Id, CustomerId, SupplierId, PackageId(unique), Name, PurchasePrice, Details, Status lifecycle.
- Media: Id, PackageId, Stage(Receiving/Departure/Arrival/Other), BlobKey, PublicUrl, Notes?, CapturedAt, UploadedAt, RecordedByAdminUserId, OperatorName?.
- WhatsAppCampaign: Id, Type(StatusUpdate/DeparturePhotos/ArrivalPhotos), ShipmentId, TriggeredByAdminUserId, CreatedAt, RecipientCount, Completed.
- WhatsAppDeliveryLog: CampaignId, CustomerId, Phone, Result(Pending/Sent/Failed/SkippedNoOptIn), FailureReason?, SentAt?.

## STATUS LIFECYCLES (STRICT)
ShipmentStatus:
Draft -> Scheduled -> ReadyToDepart -> Departed -> Arrived -> Closed
Draft/Scheduled can go Cancelled.

Gates:
- Depart requires every package has >=1 Departure photo
- Close requires every package has >=1 Arrival photo and finalized packages

PackageStatus:
Draft -> Received -> Packed -> ReadyToShip -> Shipped -> ArrivedAtDestination -> ReadyForHandout -> HandedOut
Draft/Received/Packed/ReadyToShip can go Cancelled.

Gates:
- Shipped requires >=1 Departure photo
- HandedOut requires >=1 Arrival photo

SupplyOrderStatus:
Draft -> Approved -> Ordered -> DeliveredToWarehouse -> PackedIntoPackage -> Closed
Any can go Cancelled (with reason).

## REQUIRED ADMIN UI PAGES
- Dashboard
- Customers (CRUD + consent + detail + WhatsApp individual actions)
- Warehouses (CRUD)
- GoodTypes + Goods (CRUD)
- Pricing Config (CRUD + activate/retire)
- Shipments (list/filter + detail + status transitions w/ gates + aggregated photos + WhatsApp bulk actions)
- Packages (list/filter + detail + receiving/packing/photos/handout)
- Suppliers + SupplyOrders (CRUD)
- Messaging Logs (campaigns + delivery logs)
- Group Helper Export (CSV/VCF export of opted-in primary phones)

## DETAILED USER STORIES (MUST IMPLEMENT)
Implement all user stories from the agreed spec:
- Admin login
- Master data CRUD
- Shipment create/schedule/refcode
- Package receive/pack/ready/ship/arrive/handout
- Photo upload/view from shipment and package pages
- Photo gates (depart/close/handout)
- Procurement via supply orders (internal)
- WhatsApp bulk + individual sends + consent + logs
- Messaging logs UI
- Group helper export

Do not drop acceptance criteria.
All gate failures must return HTTP 409 with:
{ code:"PHOTO_GATE_FAILED", message:"...", missing:[{ packageId, customerRef, stage }] }
