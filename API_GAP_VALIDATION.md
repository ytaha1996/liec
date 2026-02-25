# API Gap Validation (Backend + Frontend)

This pass validates key business and technical requirements from AGENTS instructions and identifies what is implemented in the current code.

## Backend business-rule checks

- ✅ Shipment one-leg rule validated at create (`originWarehouseId != destinationWarehouseId`).
- ✅ Photo gates return HTTP 409 with `code = PHOTO_GATE_FAILED` + `missing[]` for shipment depart/close and package handout.
- ✅ Added package ship gate for mandatory departure photo.
- ✅ Added package lifecycle transition endpoints for ship/arrive destination/ready-for-handout.
- ✅ Pricing snapshot immutability enforced after shipped for item create/update/delete.
- ✅ RefCode uniqueness index added (`Shipment.RefCode`).
- ✅ Admin seed supports `ADMIN_EMAIL`/`ADMIN_PASSWORD` and legacy env names.
- ✅ Azure blob key paths now follow required structure for media/exports.

## Backend technical checks

- ✅ Connection string resolution now prioritizes `ConnectionStrings:MySql`.
- ✅ CustomerRef immutability enforced on update.
- ✅ Basic customer filtering support added (`q` query).

## Frontend API UX checks

- ✅ Gate error UX exists and renders missing rows + quick links.
- ✅ Group helper export opens backend returned `publicUrl` and shows privacy warning.
- ✅ Media gallery uses `publicUrl` directly.

## Remaining technical debt

- ⚠️ API still returns EF entities in many endpoints (DTO-only requirement not fully met).
- ⚠️ True JWT auth and role claims are not yet implemented (current token is lightweight).
- ⚠️ Explicit FluentValidation validators are not yet implemented.
- ⚠️ Real EF migration snapshots are still placeholders due environment tooling limits.

