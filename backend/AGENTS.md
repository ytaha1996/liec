# Backend — Codex Build Instructions (ASP.NET Core + EF Core + MySQL + Azure Blob PUBLIC URLs)

Implement the backend in /backend exactly per root AGENTS.md.

## STACK
- ASP.NET Core Web API (latest LTS)
- EF Core + MySQL (Pomelo)
- Swagger
- FluentValidation (preferred)
- Azure.Storage.Blobs for Azure Blob Storage

## AUTH
- Only AdminUser can log in.
- POST /api/auth/login (JWT for SPA).
- Seed default AdminUser from environment variables:
  - ADMIN_EMAIL
  - ADMIN_PASSWORD (hash on seed)

## MYSQL REQUIREMENTS
- Ensure utf8mb4 for Arabic support.
- Use migrations.
- Create indices + unique constraints:
  - CustomerRef unique
  - Warehouse Code unique (length=3)
  - Shipment RefCode unique
  - ShipmentSequence unique (OriginWarehouseCode, Year)
  - SupplyOrder unique (PackageId)

## AZURE BLOB STORAGE (PUBLIC URL MODE)
All photos and future exports are stored in Azure Blob Storage and accessed by PUBLIC URL (no SAS).
Use Azure.Storage.Blobs SDK.

Configuration keys (appsettings + env override):
- ConnectionStrings:MySql
- AzureBlob:ConnectionString
- AzureBlob:MediaContainer (default "media")
- AzureBlob:ExportsContainer (default "exports")
- AzureBlob:PublicBaseUrl (optional override; else derive from blobClient.Uri)

Storage rules:
- Upload photos to container AzureBlob:MediaContainer
- blobName structure:
  media/packages/{packageId}/{stage}/{yyyy}/{mm}/{guid}.{ext}
- Save to DB:
  - BlobKey = blobName
  - PublicUrl = blobClient.Uri.ToString()
- Future exports go to ExportsContainer similarly:
  exports/reports/{yyyy}/{mm}/{guid}.xlsx

## CORE SERVICES
1) RefCodeService (transaction safe):
- Based on ShipmentSequence per origin/year.
- Format ORIGIN-YYNN (min 2 digits; allow more digits automatically).

2) PricingService:
- Rate resolution: Good overrides -> GoodType -> Active PricingConfig defaults.
- Charge = max(weight*rateKg, volume*rateM3).
- Snapshot:
  - per PackageItem LineCharge
  - package totals + AppliedRatePerKg/M3 + ChargeAmount
- Prevent item/pricing edits after Package is Shipped.

3) PhotoComplianceService:
- package has stage photo: count(Media where PackageId + Stage) >= 1
- Gates:
  - Shipment depart: all packages must have departure photos
  - Shipment close: all packages must have arrival photos and finalized
  - Package handout: must have arrival photo
- Failure response: HTTP 409 with code PHOTO_GATE_FAILED and missing list.

4) WhatsApp:
- Implement IWhatsAppSender + Stub provider (no real integration).
- Bulk send uses unique customers in shipment packages.
- Respect consent flags; if not opted in -> log SkippedNoOptIn.
- Photo sends:
  - Per customer, gather ONLY their package photos for given stage.
  - Use Media.PublicUrl for sending.
- Persist WhatsAppCampaign + WhatsAppDeliveryLog for every attempt.

5) Media endpoints:
- POST /api/packages/{id}/media multipart/form-data:
  fields: stage, capturedAt?, operatorName?, notes?, file
  - upload to Azure Blob -> store BlobKey + PublicUrl in Media table
- GET /api/packages/{id}/media returns list including PublicUrl
- GET /api/shipments/{id}/media aggregated view grouped by package

6) Group helper export:
- Generate CSV and VCF export files listing opted-in customer PrimaryPhone numbers.
- Store export files in Azure blob (ExportsContainer) and return the PublicUrl.
- Also allow returning file content directly for small exports, but still store in blob for history.

## REQUIRED API ENDPOINTS
Auth:
- POST /api/auth/login

Customers:
- GET /api/customers (search/filter)
- POST /api/customers
- PUT /api/customers/{id}
- GET /api/customers/{id}
- PATCH /api/customers/{id}/whatsapp-consent

Warehouses:
- GET/POST/PUT /api/warehouses
- GET /api/warehouses/{id}

GoodTypes:
- GET/POST/PUT /api/good-types

Goods:
- GET/POST/PUT /api/goods

Pricing Config:
- GET/POST /api/pricing-configs
- POST /api/pricing-configs/{id}/activate
- POST /api/pricing-configs/{id}/retire

Shipments:
- GET /api/shipments (filters)
- POST /api/shipments
- GET /api/shipments/{id}
- POST /api/shipments/{id}/schedule
- POST /api/shipments/{id}/ready-to-depart
- POST /api/shipments/{id}/depart  (GATED)
- POST /api/shipments/{id}/arrive
- POST /api/shipments/{id}/close   (GATED)
- GET /api/shipments/{id}/media (aggregated by package, includes PublicUrl)

Packages:
- POST /api/shipments/{shipmentId}/packages
- GET /api/packages (filters)
- GET /api/packages/{id}
- POST /api/packages/{id}/receive
- POST /api/packages/{id}/pack
- POST /api/packages/{id}/ready-to-ship
- POST /api/packages/{id}/handout (GATED)

Package Items:
- POST /api/packages/{id}/items
- PUT /api/packages/{id}/items/{itemId}
- DELETE /api/packages/{id}/items/{itemId}

Media:
- POST /api/packages/{id}/media
- GET /api/packages/{id}/media

Suppliers:
- GET/POST/PUT /api/suppliers
- GET /api/suppliers/{id}

SupplyOrders:
- GET/POST/PUT /api/supply-orders
- GET /api/supply-orders/{id}

WhatsApp:
- POST /api/shipments/{id}/whatsapp/status/bulk
- POST /api/shipments/{id}/whatsapp/photos/departure/bulk
- POST /api/shipments/{id}/whatsapp/photos/arrival/bulk
- POST /api/customers/{customerId}/whatsapp/status (individual; requires shipmentId)
- POST /api/customers/{customerId}/whatsapp/photos/departure?shipmentId=...
- POST /api/customers/{customerId}/whatsapp/photos/arrival?shipmentId=...

Messaging Logs:
- GET /api/whatsapp/campaigns
- GET /api/whatsapp/campaigns/{id}

Exports:
- POST /api/exports/group-helper (creates export in blob, returns PublicUrl)

## QUALITY
- Use DTOs; do not expose EF entities.
- Consistent error shapes and validation errors.
- Include README with run steps.
- Include migrations and seed.
