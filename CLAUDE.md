# LIEC Shipping Platform — Developer Reference

## Project Overview

Internal shipping/logistics management system for tracking customer packages transported between international warehouses (Lebanon, Gabon, China, Dubai) using shared shipment containers. Used exclusively by company employees.

**Stack:** .NET 8 API + React 19 (Vite + TypeScript + shadcn/ui + Tailwind v4) in `frontend-new/`

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
│   │   ├── Accounting/             # Invoice, InvoiceLine, Tax, Account, JournalEntry, Payment, Money
│   │   └── Enums.cs                # All enums
│   ├── Data/AppDbContext.cs        # DbContext + indexes
│   ├── Dtos/                       # ApiDtos.cs (DTOs + DtoMap), CommonDtos.cs, MediaUploadRequest.cs
│   ├── Validators/                 # FluentValidation request validators
│   ├── Migrations/                 # EF Core migrations
│   └── Program.cs                  # DI, auth, seed data, startup
├── frontend-new/                   # React 19 + Vite + shadcn/ui + Tailwind v4 (the only frontend)
│   ├── src/
│   │   ├── api/                    # DataService (fetch wrapper) + client.ts helpers (getJson, postJson, …) + parseApiError
│   │   ├── pages/                  # Page components by domain
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn primitives (CLI-managed — don't hand-edit)
│   │   │   ├── inputs/             # Generic* form inputs
│   │   │   ├── dynamic-form/       # Config-driven DynamicFormWidget (react-hook-form + zod)
│   │   │   ├── enhanced-table/     # Sortable/filterable/paginated table
│   │   │   ├── layout/             # Header, AppShell, AppLauncher, RequireAuth, RequireModule, MainPage*
│   │   │   ├── dialogs/            # GenericDialog, GenericDrawer, ConfirmationBox
│   │   │   └── media/, feedback/, misc/, information-widget/
│   │   ├── redux/                  # Store (user + confirmation slices)
│   │   ├── constants/              # Status colors, labels
│   │   ├── helpers/                # rbac, formatting, validation, fx-rates, user-token
│   │   ├── hooks/                  # useLoader, useInitializeFunction, useDebouncedValue, usePageTitle
│   │   ├── theme/                  # globals.css (Tailwind + brand vars)
│   │   ├── application.ts          # Module definitions (ops, master, comms, admin) + RBAC visibility
│   │   └── App.tsx                 # Routes (RequireAuth + per-module RequireModule guards)
│   └── vite.config.ts
├── docs/ROLES_AND_PERMISSIONS.md   # RBAC audit + permission matrix
└── plan.mdf                        # Original project proposal
```

> The legacy MUI app (`frontend/`) was removed 2026-07-24; `frontend-new/` is the sole frontend.
> Its README documents the per-page loader pattern and MUI→shadcn mapping.

---

## Database & ORM

- **Provider:** MySQL via Pomelo (`Pomelo.EntityFrameworkCore.MySql 8.0.2`)
- **Fallback:** In-memory DB if MySQL connection string is empty
- **Migrations:** Auto-applied via `Migrate()` on startup
- **CLI migration issues:** SSL errors with `dotnet ef database update` — use startup migration instead

### Entity Model (32 tables)

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **AdminUser** | Email, PasswordHash, IsActive | BCrypt hashed passwords |
| **Customer** | Name, PrimaryPhone, Email, CompanyName, TaxId, BillingAddress | 1:1 WhatsAppConsent |
| **WhatsAppConsent** | CustomerId (PK), OptInStatusUpdates, OptInDeparturePhotos, OptInArrivalPhotos | Auto-created with customer |
| **Warehouse** | Code (unique, max 3), Name, City, Country, MaxWeightKg, MaxCbm | 4 seeded: BEI, GAB, CHN, DXB |
| **GoodType** | NameEn, NameAr, RatePerKg?, RatePerCbm?, CanBreak, CanBurn | Bilingual, nullable rates override config defaults |
| **PricingConfig** | Name, Currency, DefaultRatePerKg, DefaultRatePerCbm, MinimumCharge, Status | Lifecycle: Draft→Scheduled→Active→Retired |
| **Shipment** | RefCode (unique), TiiuCode, OriginWarehouseId, DestinationWarehouseId, Status, MaxWeightKg, MaxCbm, TotalWeightKg, TotalCbm, PlannedDepartureDate, PlannedArrivalDate, ActualDepartureAt, ActualArrivalAt | 1:many Packages |
| **ShipmentSequence** | OriginWarehouseCode, Year, LastNumber | RefCode format: `{CODE}-{YY}{NN}` |
| **Package** | ShipmentId, CustomerId, ProvisionMethod, Status, WeightKg, Cbm, Currency, AppliedRatePerKg, AppliedRatePerCbm, ChargeAmount, PriceBasis, FeeAmount, FeeReason, DiscountAmount, DiscountReason, HasDeparturePhotos, HasArrivalPhotos, HasPricingOverride, SupplyOrderId, Note | 1:many Items/Media/PricingOverrides |
| **PackageItem** | PackageId, GoodTypeId, Quantity (default 1), Note | No weight/volume (moved to Package) |
| **PackagePricingOverride** | PackageId, OverrideType, OriginalValue, NewValue, Reason, AdminUserId | 3 types: RatePerKg, RatePerCbm, TotalCharge |
| **Supplier** | Name, Email, IsActive | For procurement |
| **SupplyOrder** | CustomerId, SupplierId, PackageId, Name, PurchasePrice, Details, Status, CancelReason | Lifecycle: Draft→Approved→Ordered→Delivered→Packed→Closed |
| **Media** | PackageId, Stage, BlobKey, PublicUrl, OperatorName, Notes | Stages: Receiving, Departure, Arrival, Other |
| **WhatsAppCampaign** | Type, ShipmentId, TriggeredByAdminUserId, RecipientCount, Completed | Types: StatusUpdate, DeparturePhotos, ArrivalPhotos |
| **WhatsAppDeliveryLog** | CampaignId, CustomerId, Phone, Result, FailureReason, SentAt | Results: Pending, Sent, Failed, SkippedNoOptIn |
| **AuditLog** | EntityType, EntityId, Action, OldValue, NewValue, AdminUserId | Populated across auth, users, currencies, master data, pricing, shipments/packages/supply-order transitions, media/document uploads, FX overrides, and every accounting act |

#### Accounting (Models/Accounting/ — the ACC-01…ACC-20 layer)

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **Invoice** | Number, ShipmentId, CustomerId, Type, State, ReversesInvoiceId?, CurrencyCode, InvoiceDate, AccountingDate, UntaxedTotal, TaxTotal, GrandTotal, JournalEntryId?, PostedAt, CancelReason | One per customer per container. `INV/{container}/NNN` |
| **InvoiceLine** | InvoiceId, PackageId?, Label, `Money Amount`, TaxId?, TaxAmount, AccountId? | One per package; the label states the arithmetic |
| **Tax** | Code, Name, Rate, Treatment, AccountId, IsActive | Configurable; **nothing applied yet** — every invoice resolves to 0 |
| **Account** | Code (unique), NameEn/Fr/Ar, Type, ParentCode, IsPostable | The chart, as data. `Display => "{Code} {NameEn}"` |
| **AccountingSettings** | Receivable/Revenue/Tax/Bank/RoundingAccountId | Which account each posting uses — a setting, never a constant |
| **Journal** | Code, Name, Type | Sales / Purchases / Bank / Miscellaneous |
| **AccountingPeriod** | Year, Month (unique), State, ClosedAt | Closed months refuse further entries |
| **JournalEntry** | Number, JournalId, AccountingDate, PeriodId, Reference, SourceType/SourceId | `TotalDebit`, `TotalCredit`, `IsBalanced` are derived |
| **JournalEntryLine** | AccountId, Debit, Credit, CurrencyCode, Label, CustomerId? | Never both a debit and a credit |
| **Payment** | Number (`PAY/{yyyy}/NNNN`), CustomerId, `Money Amount`, Method, Reference, JournalEntryId | `Allocated` / `Unallocated` derived from allocations |
| **PaymentAllocation** | PaymentId, InvoiceId, Amount | One payment can settle several invoices, in part or in full |

`Money` is an EF **owned type** (`Amount` + `CurrencyCode`) used by every accounting amount.
`Plus`/`Minus` throw on a currency mismatch, so ACC-14 is enforced by the type rather than by
discipline. `Package.InvoiceLineId` is the idempotency key that makes re-generating safe.

### Enums (Models/Enums.cs)

```
ShipmentStatus:     Draft, Scheduled, ReadyToDepart, Departed, Arrived, Closed, Cancelled
PackageStatus:      Draft, Received, Packed, ReadyToShip, Shipped, ArrivedAtDestination, ReadyForHandout, HandedOut, Cancelled
SupplyOrderStatus:  Draft, Approved, Ordered, DeliveredToWarehouse, PackedIntoPackage, Closed, Cancelled
PricingConfigStatus: Draft, Scheduled, Active, Retired
PricingOverrideType: RatePerKg, RatePerCbm, TotalCharge
PriceBasis:         Unknown, Cbm, Weight, Minimum, Custom
ProvisionMethod:    CustomerProvided, ProcuredForCustomer
InvoiceState:       Draft, Posted, Cancelled
InvoiceType:        Invoice, CreditNote
TaxTreatment:       None, Exempt, ZeroRated, Standard
AccountType:        Receivable, Payable, Revenue, Expense, Asset, Liability, Equity
JournalType:        Sales, Purchases, Bank, Miscellaneous
PeriodState:        Open, Closed
PaymentMethod:      Cash, BankTransfer, Cheque, Other
MediaStage:         Receiving, Departure, Arrival, Other
CampaignType:       StatusUpdate, DeparturePhotos, ArrivalPhotos
DeliveryResult:     Pending, Sent, Failed, SkippedNoOptIn
```

---

## State Machines & Business Rules

### Shipment Lifecycle
```
Draft → Scheduled → ReadyToDepart → Departed → Arrived → Closed
  └→ Cancelled (from Draft, Scheduled, ReadyToDepart)
```
- **Schedule:** Requires TIIU code (regex `^[A-Z]{3,4}\d{4,7}$`)
- **ReadyToDepart:** At least 1 ReadyToShip package. Unloaded packages (Draft/Received/Packed) auto-reassigned to another Draft shipment on same route (created if none exists). Capacity recalculated.
- **Depart:** Photo compliance gate (all packages need Departure photos). Sets ActualDepartureAt.
- **Close:** Photo compliance gate (all packages need Arrival photos + be HandedOut/Cancelled).
- **Cancel:** Allowed from Draft, Scheduled and ReadyToDepart. Cascades to non-shipped packages, recalculates capacity.
- **Move packages out:** Before departure (Draft/Scheduled/ReadyToDepart) packages can be handed to the next
  shipment on the same route — the manual counterpart to the auto-reassignment above. ReadyToShip packages
  step back to Packed (the target is a Draft), and a shipment left with no packages is Cancelled automatically.

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

### Invoice Lifecycle (ACC-04, 08, 11, 19)
```
Draft ──post──> Posted ──credit note──> (a NEW document that reverses it)
  └──cancel──> Cancelled   (number stays consumed; packages become billable again)
```
- **Generate:** one draft per customer per container, one line per package. Only packages with
  `Status != Cancelled && InvoiceLineId == null`, so pressing it twice is safe and a package
  added later gets its own invoice rather than overwriting one.
- **Post:** writes a balanced entry (Dr receivable, Cr revenue, Cr tax) and freezes the invoice.
  A zero-total invoice — the real BOL has three free carriages — is marked Posted with **no**
  ledger entry, because a zero debit against a zero credit belongs nowhere in the books.
- **Posted is final:** no edit, no delete, no cancel. Correction is a credit note that references
  the original and takes its own number.
- **Cancel:** drafts only, reason required. The number is never reused, so the gap is explainable.

### Pricing Logic (Services/PricingService)
- Rate = max(WeightKg × RatePerKg, Cbm × RatePerCbm)
- Rates come from: GoodType overrides > Active PricingConfig defaults
- MinimumCharge enforced if set on config
- Pricing frozen once shipped or override applied
- Override types: RatePerKg, RatePerCbm, TotalCharge (all audited)
- **PriceBasis** records which side set the freight (Cbm / Weight / Minimum / Custom).
  Stamped by PricingService and the override path; `Services/PriceBasisHelper.cs` is the
  single definition, shared by exports and reports. Legacy rows are backfilled at startup.
- **Fee / Discount** ride on top of the freight (the BOL's FEES column) and are stored
  separately from ChargeAmount, so a pricing recalc never wipes them and the invoice keeps
  the split. Net = ChargeAmount + FeeAmount − DiscountAmount, derived and never stored.

---

## Accounting (ACC-01 … ACC-20)

Requirements come from the Finance note of 2 Sep 2026; requirement IDs are stable — quote them
in commits. **All three stages are built:** invoicing, the ledger, and receivables.

- **Declared value ≠ freight (ACC-01).** `PackageItem.DeclaredValue` is a `Money` in USD, read by
  customs; freight is what LIEC charges. Neither is ever defaulted from the other. An item
  inherits `GoodType.DefaultHsCode` unless it states its own `HsCode`.
- **The commercial invoice refuses to guess.** It used to print `UnitPrice ?? 10m` — a fabricated
  value on a customs document. Missing declared values now fail the export, naming the items.
- **Money carries its currency (ACC-14).** `Models/Accounting/Money.cs` is an EF owned type;
  combining two currencies throws rather than silently converting.
- **Invoice numbers (ACC-07/08)** are `INV/{container}/NNN`, restarting per container, derived from
  the highest surviving invoice with that prefix — there is no counter a cleanup can reset.
  Cancelled invoices keep their number consumed so gaps stay explainable.
- **Generation is idempotent (ACC-05)** via `Package.InvoiceLineId`; drafts only (ACC-04).
- **The chart is data (ACC-02).** `Account` rows plus an `AccountingSettings` row saying which
  account each posting uses. Nothing in the posting code names an account. Seeded to the mapping
  Finance specified: **4111** customer receivable, **713** freight revenue (services — *never*
  701, merchandise sales), 40 payables, 512/530 bank and cash, 4457 tax collected.
- **Every entry balances (ACC-09).** `PostingService` refuses an unbalanced entry, a zero entry,
  a negative debit or credit, and a line carrying both. There is no silent rounding line — only an
  explicitly configured rounding account may absorb a difference.
- **Posted is history (ACC-11).** No edit, no delete, no cancel. Correction is a credit note that
  references the original and takes its own number (ACC-19).
  A credit note copies the original’s **net/tax split** (pro-rata for a partial credit). Putting
  the whole gross into the untaxed total still balances, so nothing would reject it — it would
  just over-reverse revenue and never clear the tax account.
- **Closed months are closed (ACC-13).** An entry dated into a closed period is refused, so a late
  correction cannot quietly change a month already reported.
- **Payment is allocation, not a flag (ACC-18).** A `Payment` is its own entry (Dr bank, Cr
  receivable) spread across `PaymentAllocation` rows. Unpaid / partially paid / paid is derived
  from those allocations every time it is asked for, so it cannot drift from the money.
- **Free carriage.** The real BOL has three zero-value packages. They still produce a document,
  but posting one writes **no** ledger entry — a zero debit against a zero credit belongs nowhere.
- Already satisfied before this work: FX frozen at departure (ACC-15) and the immutable price
  override trail with mandatory reason (ACC-12).

### The five traps, and what holds each one down

The Finance note lists five ways the Odoo implementation failed silently. Each has a guard and a
test; if you change this area, keep them.

| Trap | Guard |
|---|---|
| 1 · A wrong chart looked right for weeks | The mapping is a setting, seeded to 713 not 701, and **every screen prints the account code and name beside the amount** |
| 2 · Codes compared by prefix | Account lookups match the **full** code; a test asserts 4111/41110 and 70/701/713 stay distinct |
| 3 · A sequence reset to 1 | Both invoice numbering and the commercial-document numbering derive from the **highest surviving record**, not a counter |
| 4 · Deleting a parent orphaned its children | `Shipment → Packages` and every accounting FK are `Restrict`; a test asserts the delete behaviour on each |
| 5 · What actually worked | Draft-first generation, mandatory override reason, FX frozen at departure — all three kept and covered |

### Tests

| Suite | Where | Covers |
|---|---|---|
| Backend (143) | `backend/ShippingPlatform.Api.Tests` | Pricing on the real 925 tariff, transition rules, invoice numbering and generation, declared value, the ledger, the financial reports, and the model guards above |
| Frontend (104) | `frontend-new/src/**/*.test.ts(x)` | Formatting, price flags, JWT claims and expiry, audit helpers, RBAC, the dynamic-form schema builder, status label/colour coverage, payment allocation, and `Money` refusing to render without a currency |
| E2E (126) | `frontend-new/e2e` | `invoicing.spec.ts` (Stage 1), `ledger.spec.ts` (posting, immutability, payments, credit notes, period lock, reports, RBAC), and `zz-real-shipment-925.spec.ts`, which invoices the real container and checks the books arrive at the BOL's **19,475,000 CFA** |

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
- `GET /{id}/media`, `GET /{id}/audit-log`
- FX snapshots: `GET /{id}/fx-snapshots`, `PUT /{id}/fx-snapshots/{code}`, `DELETE /{id}/fx-snapshots/{code}` (Admin/Manager)
- `POST /{shipmentId}/packages/bulk-transition` — bulk package action
- `POST /{id}/packages/move-to-next` — move packages to the next shipment on the route (Admin/Manager)

**Packages** (`/api/packages`)
- `POST /shipments/{shipmentId}/packages` — create in shipment
- `POST /packages/auto-assign` — find/create shipment, assign package
- GET, GET /{id}, PATCH /{id} (update weight/cbm/note)
- Transitions: `POST /{id}/receive`, `/pack`, `/ready-to-ship`, `/ship`, `/arrive-destination`, `/ready-for-handout`, `/handout`, `/cancel`
- Items: `POST /{id}/items`, `PUT /{id}/items/{itemId}`, `DELETE /{id}/items/{itemId}`
- Media: `POST /{id}/media` [FormFile], `GET /{id}/media`, `DELETE /{id}/media/{mediaId}`
- Pricing: `POST /{id}/pricing-override`, `GET /{id}/pricing-overrides`
- Adjustments: `PATCH /{id}/adjustments` — fee/discount + reasons (Admin/Manager/Accountant)

**SupplyOrders** (`/api/supply-orders`)
- GET, GET /{id}, POST, PUT /{id}
- Transitions: `POST /{id}/approve`, `/order`, `/deliver-to-warehouse`, `/pack-into-package`, `/close`, `/cancel`

**WhatsApp** (routes on shipments + customers controllers)
- `POST /shipments/{id}/whatsapp/status/bulk`, `/photos/departure/bulk`, `/photos/arrival/bulk`
- `POST /customers/{customerId}/whatsapp/status?shipmentId=`, `/photos/departure?shipmentId=`, `/photos/arrival?shipmentId=`
- `GET /whatsapp/campaigns`, `GET /whatsapp/campaigns/{id}`

**Invoices** (`/api`) — Admin/Manager/Accountant
- `POST /shipments/{id}/invoices/generate` — one draft per customer for packages not yet
  invoiced. Safe to run twice (ACC-05); never posts to the ledger (ACC-04)
- `GET /shipments/{id}/invoices`, `GET /invoices` [?state&customerId&shipmentId]
- `GET /invoices/{id}` — lines, ledger entry, derived balance, payments
- `GET /invoices/{id}/credit-notes`

**Accounting** (`/api/accounting`) — Admin/Manager/Accountant
- Invoices: `POST /invoices/{id}/post`, `/cancel`, `/credit-note`, `GET /invoices/{id}/balance`
- Payments: `POST /payments`, `GET /payments`, `GET /customers/balances`,
  `GET /customers/{id}/open-invoices`
- Chart: `GET /accounts`, `POST /accounts`, `PUT /accounts/{id}` (Admin/Manager),
  `GET /settings`, `PUT /settings` (Admin/Manager)
- Periods: `GET /periods`, `POST /periods/{year}/{month}/close` | `/reopen` (Admin/Manager)
- Ledger: `GET /entries/{id}`

**Reports** (`/api/reports`) — Admin/Manager/Accountant
- `GET /` — the report catalogue (key, title, description, supported filters)
- `GET /{key}` [?from&to&customerId&shipmentId&shipmentStatus&originWarehouseId&destinationWarehouseId&limit]
  — one report as `{ columns, rows, totals }`, aggregated DB-side. Four reports:
  `customer-summary` (every customer: shipments, volume, weight, freight/fees/discounts,
  **Total Billed**), `top-customers` (ranked, with per-CBM and per-ton rates; `limit` default 15),
  `revenue-by-month`, `container-utilisation` (used vs max, % full, what it carried).
  Four more read the ledger rather than the operational figures: `aged-receivable`
  (30/60/90/90+, boundaries inclusive at the top of each bucket), `revenue-by-period`,
  `general-ledger` and `trial-balance` (debits must equal credits).
  Rows are loose dictionaries keyed by column, so the page and the Excel writer render any
  report without bespoke code — a new report is one builder in `Services/ReportService.cs`

**Exports** (`/api/exports`)
- `POST /group-helper` — VCF/CSV customer contacts
- `POST /shipments/{id}/bol-report` — Excel BOL
- `POST /shipments/{id}/customer-invoices-excel` — per-customer invoice sheets
- `POST /reports/{key}` — Excel of any report, driven by its own columns

### Services (Services/)

| Service | Purpose |
|---------|---------|
| **TokenService** | JWT generation (HS256, 8h expiry) |
| **BlobStorageService** | Azure Blob upload/delete, container `"media"` and `"exports"` |
| **RefCodeService** | Shipment ref codes: `{CODE}-{YY}{NN}` |
| **CapacityService** | Sums package weights/CBM for shipment |
| **PricingService** | Rate calculation from config + good type; stamps PriceBasis |
| **ReportService** | The report catalogue behind `/api/reports` — one builder per report |
| **PhotoComplianceService** | Gate checks for departure/close/handout |
| **ImageWatermarkService** | SkiaSharp customer name overlay on photos (best-effort) |
| **TwilioWhatsAppSender** | Twilio API messaging (API-key auth preferred), phone validation, SID logging, media chunking (max 10/msg), test-mode redirect via `Twilio:TestPhoneNumbers` |
| **StubWhatsAppSender** | No-op for dev (used when Twilio:AccountSid is empty) |
| **ExportService** | ClosedXML Excel generation (BOL, customer invoices, commercial docs), VCF/CSV contacts |
| **TransitionRuleService** | State machine validation for all 3 lifecycles |
| **InvoiceNumberService** | `INV/{container}/NNN`, derived from the highest surviving invoice — there is no counter to reset |
| **InvoiceGenerationService** | Drafts per customer per container; skips packages already carrying a line |
| **PostingService** | Builds and writes balanced entries; refuses unbalanced, zero, or negative ones, and any entry dated into a closed period |
| **InvoicePostingService** | Post / cancel / credit note — the only ways an invoice changes state |
| **PaymentService** | Records a payment as its own entry and allocates it; derives every balance |
| **AccountingSeed** | Seeds the chart (4111, 713, 40, 512, 530, 4457, 658, 701), four journals, three tax records, and the account mapping |

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

## Frontend Architecture (`frontend-new/`)

### Tech Stack
React 19, Vite 8, TypeScript, shadcn/ui + Tailwind v4 (CVA + `cn()` — no tss-react/MUI), Redux Toolkit 2, React Router 7, react-hook-form + zod, sonner (toasts), date-fns, lucide-react, libphonenumber-js

### API Client (src/api/)
- `DataService` — static fetch wrapper (get/post/put/patch/delete/postForm), Bearer token from localStorage
- `client.ts` — `unwrap<T>()` + helpers `getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson`, `uploadMultipart`; 401 → dispatch LogoutUser + redirect /login (handler installed by App's AuthBridge)
- `parseApiError.ts` — typed `ApiError` + humanized messages; `GateError` for photo-gate failures
- Base URL set in `main.tsx` from `VITE_API_BASE_URL`

### Data Fetching Pattern (NO React Query)
- `useLoader<T>(fetcher)` per resource → `{ data, loading, error, reload }` — each independently reloadable
- `useInitializeFunction([loaders], deps?)` — Promise.allSettled for first paint
- Mutations: plain async fns calling `postJson` etc. → `toast` → `loader.reload()`

### Redux State
- **user** slice: token, isAuthenticated, role, user info (LoginUser, LoadUserSuccess, LogoutUser)
- **confirmation** slice: global confirmation dialog (OpenConfirmation with destructive/confirmText, CloseConfirmation)

### RBAC (src/helpers/rbac.ts + docs/ROLES_AND_PERMISSIONS.md)
- 4 roles: Admin, Manager, Accountant, Field — JWT role claim
- `MODULE_ACCESS` matrix + `can*` helpers gate UI actions, including `canPostInvoice`,
  `canRecordPayment`, `canManageChartOfAccounts` and `canClosePeriod` for the books
- Route enforcement: `RequireAuth` (login) + `RequireModule` (per-module) in App.tsx

### Routes (src/App.tsx)

**Operations (/ops)**
- `/ops/dashboard` → DashboardPage (stats, pending container alerts)
- `/ops/shipments` → ShipmentsPage (list + create with capacity columns)
- `/ops/shipments/:id` → ShipmentDetailPage (info, capacity bars, transitions, packages table + bulk transitions, FX snapshots, WhatsApp, exports)
- `/ops/reports` → ReportsPage (report picker, per-report filters, totals, Excel export) — Admin/Manager/Accountant
- `/ops/packages` → hidden; redirects to `/ops/shipments` (packages are managed from their shipment)
- `/ops/packages/:id` → PackageDetailPage (info, pricing, items + bulk add, photos, documents, overrides, transitions) — still reachable

**Master Data (/master)**
- `/master/customers` → CustomersPage (CRUD)
- `/master/customers/:id` → CustomerDetailPage (info, WhatsApp consent, individual messaging)
- `/master/warehouses` → WarehousesPage (CRUD)
- `/master/good-types` → GoodTypesPage (CRUD)
- `/master/pricing-configs` → PricingConfigsPage (CRUD + activate/retire)
- `/master/suppliers` → SuppliersPage (CRUD)
- `/master/supply-orders` → SupplyOrdersPage (CRUD + lifecycle)

**Finance (/finance)** — Admin/Manager/Accountant; field staff redirect to the dashboard
- `/finance/invoices` → InvoicesPage (every invoice, filterable by state)
- `/finance/invoices/:id` → InvoiceDetailPage (lines, journal entry with account names, payments,
  credit notes; post / cancel / credit-note actions)
- `/finance/receivables` → ReceivablesPage (customer balances, payments, record + allocate)
- `/finance/accounts` → ChartOfAccountsPage (accounts, account mapping, period locking)

**Communications (/comms)**
- `/comms/messaging-logs` → MessagingLogsPage (campaigns + delivery logs)
- `/comms/group-helper-export` → GroupHelperExportPage (CSV/VCF export)

### Key Reusable Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **EnhancedTable** | `components/enhanced-table/` | Sortable, filterable, paginated table. Column types: TEXT, NUMBER, DATE, DATETIME, COLORED_CHIP, LINK, Clickable, CURRENCY, PhoneNumber, Action, CUSTOM |
| **DynamicFormWidget** | `components/dynamic-form/` | Config-driven form on react-hook-form + zod. Field types: TEXT, TEXTAREA, NUMBER, CURRENCY, PHONENUMBER, EMAIL, SELECT, MULTISELECT, CHECKBOX, CHECKBOXLIST, FILE, DATE, IMAGE, IMAGELIST, TAGS. `grid` hints, `conditionalHidden/Required/Disable`, `customValidator` |
| **InformationWidget** | `components/information-widget/` | Read-only field grid. Types: Text, Currency, Date, Datetime, Boolean, MobileNumber, Custom; per-field inline `action` |
| **GenericDialog / GenericDrawer** | `components/dialogs/` | Modal (full-screen on phones, sm/md/lg/full) / right Sheet |
| **ConfirmationBox** | `components/dialogs/` | Global redux-driven confirm (destructive variant) — mounted once in App |
| **Header + AppLauncher** | `components/layout/` | Current-app nav + grid launcher (search, role-filtered) |
| **MainPageTitle / MainPageSection / DetailPageLayout** | `components/layout/` | Page chrome (teal headers, action stacks) |
| **MediaStageCards / PhotoGalleryModal** | `components/media/` | Photo upload/display by stage + lightbox |
| **Money** | `components/accounting/` | Renders an amount **only** with its currency — refuses rather than guessing (ACC-14) |
| **StatusBadge / Breadcrumbs / EmptyState / TableSkeleton / LoadingButton** | `components/misc/`, `components/feedback/` | Atoms |

### Frontend Patterns
- **List pages:** `useLoader` GET → EnhancedTable → Create/Edit via GenericDialog + DynamicFormWidget → `loader.reload()` after save
- **Detail pages:** `useLoader` per resource + `useInitializeFunction` → InformationWidget + sub-tables → transition buttons via `OpenConfirmation`
- **State transitions:** ALLOWED_TRANSITIONS map per status → MainPageTitle actions → confirmation → POST → reload
- **Photo gates:** GateError response rendered as alert with missing-items table
- **RBAC gating:** wrap actions in `can*()` checks; routes in `RequireModule`

---

## Display Conventions

- **Weight display:** Shown in **tons** (value / 1000, 3 decimals) everywhere in UI. Inputs remain in **kg**.
- **Volume:** Labeled as **CBM** (not m3)
- **Field ordering:** CBM first, then Weight — in tables, detail pages, and Excel exports
- **Excel BOL:** tons + CBM-first ordering; carries a "Priced On" column next to the
  customer plus real Fees/Discount columns
- **Customer invoice Excel:** Weight in tons, CBM in m3 with 3 decimals

---

## External Integrations

### Azure Blob Storage
- Containers: `media` (photos), `exports` (generated files)
- Photos watermarked with customer name via SkiaSharp before upload
- PublicUrl stored in Media entity for direct access

### Twilio WhatsApp
- Conditional: uses `TwilioWhatsAppSender` if `Twilio:AccountSid` configured, else `StubWhatsAppSender`
- Auth: API key pair (`ApiKeySid`+`ApiKeySecret`) preferred over `AuthToken`
- `WhatsAppFrom` must be E.164 (`+…`) — sandbox `+14155238886` or the approved business number
- Test mode: non-empty `Twilio:TestPhoneNumbers` array redirects ALL sends to those numbers with a `[TEST → +original]` prefix; empty array = production
- Phone validation: must match `^\+\d{8,15}$`
- Media: **one attachment per WhatsApp message** — extra MediaUrl values are silently ignored by
  WhatsApp (unlike MMS), so each photo is sent as its own message, 200ms apart, each error-checked
- Images must be JPEG/PNG (Twilio does not transcode); uploads are re-encoded to JPEG by the
  watermarker and HEIC is refused at upload. Image cap 5 MB, overall 20 MB
- 200ms throttle between bulk sends
- WhatsApp policy: free text only inside a 24h customer-service window; first outbound to a cold recipient needs a pre-approved Content Template

---

## Build & Run

```bash
# Backend
cd backend/ShippingPlatform.Api
dotnet build
dotnet run   # runs on configured port, auto-migrates DB

# Backend unit tests (xUnit + EF InMemory)
cd backend && dotnet test

# Frontend unit tests (Vitest + Testing Library)
cd frontend-new && npm run test:unit

# Frontend
cd frontend-new
npm install
npm run dev  # Vite dev server on :5173
npm run build  # tsc -b && vite build
npx tsc --noEmit -p tsconfig.app.json  # type check only

# Backend unit tests (xUnit)
cd backend && dotnet test

# Frontend unit tests (Vitest)
cd frontend-new && npm run test:unit

# E2E (Playwright — boots backend on InMemory provider + vite automatically)
cd frontend-new
npm run test:e2e   # requires backend `dotnet build` first (webServer uses --no-build)
```

---

## Key Implementation Notes

- **RBAC:** 4 roles (Admin, Manager, Accountant, Field) enforced via `[Authorize(Roles=...)]` + frontend `can*` helpers + `RequireModule` route guards — full matrix in `docs/ROLES_AND_PERMISSIONS.md`
- **Seed data:** 1 admin user, 4 warehouses, 12 good types, 20 customers with consents, 1 pricing config
- **Auto-assign:** Creates Draft shipment for route if none exists
- **Inline supply orders:** Packages with ProcuredForCustomer can auto-create supply orders during creation
- **Bulk transitions:** Validation pass first, all-or-nothing execution
- **Capacity:** Sum of non-cancelled packages; threshold (default 80%) for UI warnings only
- **Accounting:** double-entry behind the operational data. The chart, the account each posting
  uses, and the open/closed months are all **data Finance maintains** — nothing in the posting
  code names an account. Freight revenue maps to **713 (services)**, never 701 (merchandise);
  account codes are matched **in full**, never by prefix. Every screen showing a posted amount
  prints the account code and name beside it.
- **AuditLog:** actively populated — auth events, user CRUD, currency CRUD, master data writes, pricing config CRUD + activate/retire, pricing overrides, customer writes/consent, shipment/package/supply-order transitions, media/document uploads, FX overrides. Viewable via `/audit-log` endpoints (Admin/Manager)
