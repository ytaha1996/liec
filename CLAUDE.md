# LIEC Shipping Platform — Developer Reference

## Project Overview

Internal shipping/logistics management system for tracking customer packages transported between international warehouses (Lebanon, Gabon, China, Dubai) using shared shipment containers. Used exclusively by company employees.

**Stack:** .NET 8 API + React 18 (Vite + TypeScript + MUI)

---

## Repository Structure

```
liec/
├── backend/ShippingPlatform.Api/   # .NET 8 Web API
│   ├── Controllers/                # API endpoints
│   ├── Business/                   # Business logic layer
│   ├── Services/                   # Service layer (pricing, blob, twilio, exports, etc.)
│   ├── Models/
│   │   ├── Entities/               # EF Core entity classes (one per file)
│   │   └── Enums.cs                # All enums
│   ├── Data/AppDbContext.cs        # DbContext + indexes
│   ├── Dtos/                       # ApiDtos.cs (DTOs + DtoMap), CommonDtos.cs, MediaUploadRequest.cs
│   ├── Validators/                 # FluentValidation request validators
│   ├── Migrations/                 # EF Core migrations
│   └── Program.cs                  # DI, auth, seed data, startup
├── frontend/                       # React + Vite + MUI
│   ├── src/
│   │   ├── api/client.ts           # Axios instance + helpers (getJson, postJson, putJson, patchJson, uploadMultipart)
│   │   ├── pages/                  # Page components by domain
│   │   ├── components/             # ~45 reusable components
│   │   ├── redux/                  # Store (user + confirmation slices)
│   │   ├── constants/              # Status colors, labels
│   │   ├── helpers/                # Formatting, validation, token utils
│   │   ├── theme/                  # MUI theme (brand teal #00A6A6, navy #243043)
│   │   ├── Portal.tsx              # Auth gate
│   │   ├── Protected.tsx           # Route definitions
│   │   └── application.ts          # Module definitions (ops, master, comms)
│   └── vite.config.ts
└── plan.mdf                        # Original project proposal
```

---

## Database & ORM

- **Provider:** MySQL via Pomelo (`Pomelo.EntityFrameworkCore.MySql 8.0.2`)
- **Fallback:** In-memory DB if MySQL connection string is empty
- **Migrations:** Auto-applied via `Migrate()` on startup
- **CLI migration issues:** SSL errors with `dotnet ef database update` — use startup migration instead

### Entity Model (17 tables)

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **AdminUser** | Email, PasswordHash, IsActive | BCrypt hashed passwords |
| **Customer** | Name, PrimaryPhone, Email, CompanyName, TaxId, BillingAddress | 1:1 WhatsAppConsent |
| **WhatsAppConsent** | CustomerId (PK), OptInStatusUpdates, OptInDeparturePhotos, OptInArrivalPhotos | Auto-created with customer |
| **Warehouse** | Code (unique, max 3), Name, City, Country, MaxWeightKg, MaxCbm | 4 seeded: BEI, GAB, CHN, DXB |
| **GoodType** | NameEn, NameAr, RatePerKg?, RatePerCbm?, CanBreak, CanBurn | Bilingual, nullable rates override config defaults |
| **PricingConfig** | Name, Currency, DefaultRatePerKg, DefaultRatePerCbm, MinimumCharge, Status | Lifecycle: Draft→Scheduled→Active→Retired |
| **Shipment** | RefCode (unique), TiiuCode, OriginWarehouseId, DestinationWarehouseId, Status, MaxWeightKg, MaxCbm, TotalWeightKg, TotalCbm, PlannedDepartureDate, PlannedArrivalDate, ActualDepartureAt, ActualArrivalAt, External* tracking fields | 1:many Packages |
| **ShipmentSequence** | OriginWarehouseCode, Year, LastNumber | RefCode format: `{CODE}-{YY}{NN}` |
| **Package** | ShipmentId, CustomerId, ProvisionMethod, Status, WeightKg, Cbm, Currency, AppliedRatePerKg, AppliedRatePerCbm, ChargeAmount, HasDeparturePhotos, HasArrivalPhotos, HasPricingOverride, SupplyOrderId, Note | 1:many Items/Media/PricingOverrides |
| **PackageItem** | PackageId, GoodTypeId, Quantity (default 1), Note | No weight/volume (moved to Package) |
| **PackagePricingOverride** | PackageId, OverrideType, OriginalValue, NewValue, Reason, AdminUserId | 3 types: RatePerKg, RatePerCbm, TotalCharge |
| **Supplier** | Name, Email, IsActive | For procurement |
| **SupplyOrder** | CustomerId, SupplierId, PackageId, Name, PurchasePrice, Details, Status, CancelReason | Lifecycle: Draft→Approved→Ordered→Delivered→Packed→Closed |
| **Media** | PackageId, Stage, BlobKey, PublicUrl, OperatorName, Notes | Stages: Receiving, Departure, Arrival, Other |
| **WhatsAppCampaign** | Type, ShipmentId, TriggeredByAdminUserId, RecipientCount, Completed | Types: StatusUpdate, DeparturePhotos, ArrivalPhotos |
| **WhatsAppDeliveryLog** | CampaignId, CustomerId, Phone, Result, FailureReason, SentAt | Results: Pending, Sent, Failed, SkippedNoOptIn |
| **AuditLog** | EntityType, EntityId, Action, OldValue, NewValue, AdminUserId | Available but not actively populated yet |

### Enums (Models/Enums.cs)

```
ShipmentStatus:     Draft, Scheduled, ReadyToDepart, Departed, Arrived, Closed, Cancelled
PackageStatus:      Draft, Received, Packed, ReadyToShip, Shipped, ArrivedAtDestination, ReadyForHandout, HandedOut, Cancelled
SupplyOrderStatus:  Draft, Approved, Ordered, DeliveredToWarehouse, PackedIntoPackage, Closed, Cancelled
PricingConfigStatus: Draft, Scheduled, Active, Retired
PricingOverrideType: RatePerKg, RatePerCbm, TotalCharge
ProvisionMethod:    CustomerProvided, ProcuredForCustomer
MediaStage:         Receiving, Departure, Arrival, Other
CampaignType:       StatusUpdate, DeparturePhotos, ArrivalPhotos
DeliveryResult:     Pending, Sent, Failed, SkippedNoOptIn
```

---

## State Machines & Business Rules

### Shipment Lifecycle
```
Draft → Scheduled → ReadyToDepart → Departed → Arrived → Closed
  └→ Cancelled (from Draft, Scheduled only)
```
- **Schedule:** Requires TIIU code (regex `^[A-Z]{3,4}\d{4,7}$`)
- **ReadyToDepart:** At least 1 ReadyToShip package. Unloaded packages (Draft/Received/Packed) auto-reassigned to another Draft shipment on same route (created if none exists). Capacity recalculated.
- **Depart:** Photo compliance gate (all packages need Departure photos). Sets ActualDepartureAt.
- **Close:** Photo compliance gate (all packages need Arrival photos + be HandedOut/Cancelled).
- **Cancel:** Cascades to non-shipped packages, recalculates capacity.

### Package Lifecycle
```
Draft → Received → Packed → ReadyToShip → Shipped → ArrivedAtDestination → ReadyForHandout → HandedOut
  └→ Cancelled (from Draft, Received, Packed, ReadyToShip only)
```
- **Shipment-gated:** ReadyToShip requires shipment Scheduled+; Shipped requires Departed; ArrivedAtDestination+ requires Arrived
- **Packed prerequisite:** WeightKg > 0, Cbm > 0, at least 1 item
- **Ship gate:** Departure photos required
- **Handout gate:** Arrival photos required
- **Pricing:** Auto-calculated at creation & pack; frozen on Shipped; overrideable before ship
- **Cancel:** Unlinks supply order, recalculates shipment capacity

### Supply Order Lifecycle
```
Draft → Approved → Ordered → DeliveredToWarehouse → PackedIntoPackage → Closed
  └→ Cancelled (from any, requires reason)
```
- **DeliveredToWarehouse:** Auto-receives linked package (Draft→Received)
- **PackedIntoPackage:** Requires linked package
- **Cancel:** Unlinks package

### Pricing Logic (Services/PricingService)
- Rate = max(WeightKg × RatePerKg, Cbm × RatePerCbm)
- Rates come from: GoodType overrides > Active PricingConfig defaults
- MinimumCharge enforced if set on config
- Pricing frozen once shipped or override applied
- Override types: RatePerKg, RatePerCbm, TotalCharge (all audited)

---

## Backend Architecture

### Layer Pattern
```
Controllers → Business → Services → Data (AppDbContext)
```

### Controllers & Endpoints

**Auth** (`/api/auth`)
- `POST /login` [AllowAnonymous, RateLimited 10/min]

**Customers** (`/api/customers`)
- GET, GET /{id}, POST, PUT /{id}
- `PATCH /{id}/whatsapp-consent`

**Warehouses** (`/api/warehouses`) — GET, GET /{id}, POST, PUT /{id}

**GoodTypes** (`/api/good-types`) — GET, GET /{id}, POST, PUT /{id}

**Suppliers** (`/api/suppliers`) — GET, GET /{id}, POST, PUT /{id}

**PricingConfigs** (`/api/pricing-configs`)
- GET, GET /{id}, POST, PUT /{id}
- `POST /{id}/activate` (retires all others), `POST /{id}/retire`

**Shipments** (`/api/shipments`)
- GET [?status=], GET /{id}, POST, PATCH /{id}
- Transitions: `POST /{id}/schedule`, `/ready-to-depart`, `/depart`, `/arrive`, `/close`, `/cancel`
- `GET /{id}/ready-to-depart/preview` — shows which packages depart vs get reassigned
- `POST /{id}/tracking/sync` — external carrier sync
- `GET /{id}/media`
- `POST /{shipmentId}/packages/bulk-transition` — bulk package action

**Packages** (`/api/packages`)
- `POST /shipments/{shipmentId}/packages` — create in shipment
- `POST /packages/auto-assign` — find/create shipment, assign package
- GET, GET /{id}, PATCH /{id} (update weight/cbm/note)
- Transitions: `POST /{id}/receive`, `/pack`, `/ready-to-ship`, `/ship`, `/arrive-destination`, `/ready-for-handout`, `/handout`, `/cancel`
- Items: `POST /{id}/items`, `PUT /{id}/items/{itemId}`, `DELETE /{id}/items/{itemId}`
- Media: `POST /{id}/media` [FormFile], `GET /{id}/media`, `DELETE /{id}/media/{mediaId}`
- Pricing: `POST /{id}/pricing-override`, `GET /{id}/pricing-overrides`

**SupplyOrders** (`/api/supply-orders`)
- GET, GET /{id}, POST, PUT /{id}
- Transitions: `POST /{id}/approve`, `/order`, `/deliver-to-warehouse`, `/pack-into-package`, `/close`, `/cancel`

**WhatsApp** (routes on shipments + customers controllers)
- `POST /shipments/{id}/whatsapp/status/bulk`, `/photos/departure/bulk`, `/photos/arrival/bulk`
- `POST /customers/{customerId}/whatsapp/status?shipmentId=`, `/photos/departure?shipmentId=`, `/photos/arrival?shipmentId=`
- `GET /whatsapp/campaigns`, `GET /whatsapp/campaigns/{id}`

**Exports** (`/api/exports`)
- `POST /group-helper` — VCF/CSV customer contacts
- `POST /shipments/{id}/bol-report` — Excel BOL
- `POST /shipments/{id}/customer-invoices-excel` — per-customer invoice sheets

### Services (Services/)

| Service | Purpose |
|---------|---------|
| **TokenService** | JWT generation (HS256, 8h expiry) |
| **BlobStorageService** | Azure Blob upload/delete, container `"media"` and `"exports"` |
| **RefCodeService** | Shipment ref codes: `{CODE}-{YY}{NN}` |
| **CapacityService** | Sums package weights/CBM for shipment |
| **PricingService** | Rate calculation from config + good type |
| **PhotoComplianceService** | Gate checks for departure/close/handout |
| **ImageWatermarkService** | SkiaSharp customer name overlay on photos (best-effort) |
| **TwilioWhatsAppSender** | Twilio API messaging with phone validation, SID logging, media chunking (max 10/msg) |
| **StubWhatsAppSender** | No-op for dev (used when Twilio:AccountSid is empty) |
| **ExportService** | ClosedXML Excel generation (BOL, customer invoices), VCF/CSV contacts |
| **ShipmentTrackingLookupService** | Maersk Line API for external tracking (fail-open) |
| **TransitionRuleService** | State machine validation for all 3 lifecycles |

### Business (Business/)

| File | Classes |
|------|---------|
| **BusinessServices.cs** | AuthBusiness, MasterDataBusiness, CustomerBusiness |
| **OperationsBusiness.cs** | ShipmentBusiness, PackageBusiness, SupplyOrderBusiness |
| **MessagingBusiness.cs** | WhatsAppBusiness, ExportBusiness |

### NuGet Packages
Azure.Storage.Blobs, FluentValidation.AspNetCore, JwtBearer, Pomelo MySQL, EF Core InMemory, Swashbuckle, BCrypt.Net-Next, ClosedXML, SkiaSharp, Twilio 7.*

### Configuration (appsettings.json)
```
ConnectionStrings:MySql, Auth:Secret, AllowedOrigins,
Twilio:{AccountSid,AuthToken,WhatsAppFrom},
AzureBlob:{ConnectionString,MediaContainer,ExportsContainer,PublicBaseUrl}
```
- Seed admin: `SeedAdmin:Email` / `SeedAdmin:Password` (or env `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- `CapacityThresholdPct` (default 80)

---

## Frontend Architecture

### Tech Stack
React 18, Vite 5, TypeScript 5, MUI 6, React Query 5, Redux Toolkit 2, Axios, React Router 6, React Toastify, date-fns, dayjs, numeral

### API Client (src/api/client.ts)
- Base URL: `VITE_API_BASE_URL` env var (default `http://localhost:53095`)
- Request interceptor: adds Bearer token from localStorage
- Response interceptor: 401 → redirect to /login
- Helpers: `getJson`, `postJson`, `putJson`, `patchJson`, `uploadMultipart`, `parseApiError`

### Redux State
- **user** slice: token, isAuthenticated, user info (LoginUser, LoadUserSuccess, LogoutUser)
- **confirmation** slice: global confirmation dialog (OpenConfirmation, CloseConfirmation)

### Routes (src/Protected.tsx)

**Operations (/ops)**
- `/ops/dashboard` → DashboardPage (stats, pending container alerts)
- `/ops/shipments` → ShipmentsPage (list + create with capacity columns)
- `/ops/shipments/:id` → ShipmentDetailPage (info, capacity bars, transitions, packages table, tracking, WhatsApp, exports, bulk actions)
- `/ops/packages` → PackagesPage (list + auto-assign)
- `/ops/packages/:id` → PackageDetailPage (info, pricing, items, photos, overrides, transitions)

**Master Data (/master)**
- `/master/customers` → CustomersPage (CRUD)
- `/master/customers/:id` → CustomerDetailPage (info, WhatsApp consent, individual messaging)
- `/master/warehouses` → WarehousesPage (CRUD)
- `/master/good-types` → GoodTypesPage (CRUD)
- `/master/pricing-configs` → PricingConfigsPage (CRUD + activate/retire)
- `/master/suppliers` → SuppliersPage (CRUD)
- `/master/supply-orders` → SupplyOrdersPage (CRUD + lifecycle)

**Communications (/comms)**
- `/comms/messaging-logs` → MessagingLogsPage (campaigns + delivery logs)
- `/comms/group-helper-export` → GroupHelperExportPage (CSV/VCF export)

### Key Reusable Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **EnhancedTable** | `components/enhanced-table/` | Sortable, filterable, paginated table with column types: TEXT, NUMBER, DATE, COLORED_CHIP, Clickable, Action |
| **DynamicFormWidget** | `components/dynamic-widget/` | Renders form from field config. Types: TEXT, NUMBER, SELECT, DATE, CHECKBOX, TEXTAREA, PHONE, EMAIL, FILE, IMAGE |
| **InformationWidget** | `components/information-widget/` | Read-only field grid display. Types: Text, Currency, Date, Datetime, Boolean, MobileNumber |
| **GenericDialog** | `components/GenericDialog/` | Modal dialog wrapper |
| **MainPageSection** | `components/layout-components/` | Teal-header Paper section |
| **DetailPageLayout** | `components/layout-components/` | Detail page template (title, chips, actions, content) |
| **PageActionsSection** | `components/layout-components/` | Status-filtered action buttons |
| **PhotoGallery/MediaStageCards** | `components/media/` | Photo display by stage with gallery modal |
| **PricingOverrideHistory** | `components/pricing/` | Override audit trail table |
| **WhatsAppCampaignCards** | `pages/shipments/components/` | Campaign cards per type (status, departure, arrival) |

### Frontend Patterns
- **List pages:** React Query GET → EnhancedTable → Create/Edit via GenericDialog + DynamicFormWidget
- **Detail pages:** React Query GET by ID → InformationWidget + sub-tables + action buttons → mutations for transitions
- **State transitions:** ALLOWED_TRANSITIONS map per status → PageActionsSection renders available actions → confirmation dialog → POST mutation
- **Photo gates:** GateError response rendered as alert with missing items table

---

## Display Conventions

- **Weight display:** Shown in **tons** (value / 1000, 3 decimals) everywhere in UI. Inputs remain in **kg**.
- **Volume:** Labeled as **CBM** (not m3)
- **Field ordering:** CBM first, then Weight — in tables, detail pages, and Excel exports
- **Excel BOL:** Already uses tons + CBM-first ordering
- **Customer invoice Excel:** Weight in tons, CBM in m3 with 3 decimals

---

## External Integrations

### Azure Blob Storage
- Containers: `media` (photos), `exports` (generated files)
- Photos watermarked with customer name via SkiaSharp before upload
- PublicUrl stored in Media entity for direct access

### Twilio WhatsApp
- Conditional: uses `TwilioWhatsAppSender` if `Twilio:AccountSid` configured, else `StubWhatsAppSender`
- Phone validation: must match `^\+\d{8,15}$`
- Media: max 10 per message, remaining sent in follow-up messages
- 200ms throttle between bulk sends
- Rich message templates with shipment details, customer name, dates

### Maersk Tracking
- HTTP client to Maersk Line API for external tracking data
- Fail-open: returns "Unknown" on API failure

---

## Build & Run

```bash
# Backend
cd backend/ShippingPlatform.Api
dotnet build
dotnet run   # runs on configured port, auto-migrates DB

# Frontend
cd frontend
npm install
npm run dev  # Vite dev server on :5173
npm run build
npx tsc --noEmit  # type check
```

---

## Key Implementation Notes

- **1 admin role only** — no RBAC yet (deferred)
- **Seed data:** 1 admin user, 4 warehouses, 12 good types, 20 customers with consents, 1 pricing config
- **Auto-assign:** Creates Draft shipment for route if none exists
- **Inline supply orders:** Packages with ProcuredForCustomer can auto-create supply orders during creation
- **Bulk transitions:** Validation pass first, all-or-nothing execution
- **Capacity:** Sum of non-cancelled packages; threshold (default 80%) for UI warnings only
- **AuditLog table:** Schema exists but not actively populated in current release
