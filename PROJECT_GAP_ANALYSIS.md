# Transition Plan & Gap Analysis (Proposal Lifecycle Migration)

This document now focuses on moving safely to the proposal shipment lifecycle with no regression in operational flow.

## 1) Target shipment status model (proposal)
- Draft -> Scheduled -> ReadyToDepart -> Departed -> Arrived -> Closed
- Draft/Scheduled -> Cancelled

## 2) What changed in this iteration (toward target)
- Backend shipment status enum aligned to proposal lifecycle names.
- Shipment transition rules aligned to proposal sequence and cancel rules.
- Shipment endpoints added/aligned:
  - `POST /api/shipments/{id}/schedule`
  - `POST /api/shipments/{id}/ready-to-depart`
  - `POST /api/shipments/{id}/depart`
  - `POST /api/shipments/{id}/close`
- Backward-compat aliases preserved to avoid frontend/API regression:
  - `activate -> schedule`
  - `load -> ready-to-depart`
  - `ship -> depart`
  - `complete -> close`
- RefCode generation migrated to per-origin annual format:
  - `<ORIGIN>-<YY><NN>` (example: `BER-2601`)
- Added optional `TiiuCode` field on shipment:
  - optional in Draft create
  - enforced before scheduling and before departing
- Added external tracking sync flow:
  - `POST /api/shipments/{id}/tracking/sync` with `code`
  - persisted fields on shipment: tracking code, carrier name, origin, destination, ETA, external status, last synced time
  - blocked for Draft/Cancelled
- Frontend shipment screens updated to use proposal statuses/actions and include tracking sync UI.

## 3) What is still needed to complete transition without regression

### Data migration / compatibility hardening
1. Add EF migration for:
   - new shipment columns (`TiiuCode`, external tracking fields)
   - `ShipmentSequence.OriginWarehouseCode`
   - composite unique index on `(OriginWarehouseCode, Year)`
2. Add database remap migration for legacy shipment status integers to new enum values.
3. Add API contract version note/change log for clients consuming old status strings.

### Operational safeguards
1. Add endpoint to update TIIU code after draft create (`PATCH /api/shipments/{id}/tiiu`).
2. Add server validation for TIIU format (strict pattern if business confirms exact format).
3. Ensure shipment list filters and chips fully reflect new statuses in every frontend table.

### Tracking integration reliability
1. Replace placeholder/free lookup with provider abstraction + configurable providers.
2. Add retry/backoff + timeout + provider error classification.
3. Add “manual override” fields/edit route for tracking data if provider data is incomplete.

## 4) Business/technical gaps introduced or highlighted by this transition

### Business gaps
- Proposal requests richer tracking attributes (“name if available”, origin, destination, ETA, status); free APIs may not consistently provide all fields.
- TIIU required at Scheduled/Departed can block operations unless UI provides a clear edit path and validation feedback.
- If legacy clients still post old transitions only, behavior is okay via aliases, but reporting semantics must be updated.

### Technical gaps
- No migration yet means runtime DB drift risk in environments using existing schema.
- Free/public tracking APIs are unstable and may be rate-limited/unavailable; this can create inconsistent shipment tracking freshness.
- Status enum change can break downstream analytics/export consumers unless mapped explicitly.

## 5) Done vs different vs missing after this transition

### Done
- Proposal shipment status naming and transition endpoints implemented.
- Per-origin annual refcode sequencing implemented.
- TIIU gating at schedule/depart implemented.
- External tracking sync endpoint + persistence implemented.

### Done but different
- Tracking provider currently fail-open/placeholder behavior due free API variability.
- Backward compatibility aliases remain (intentional) and should be deprecated later.

### Missing
- Formal provider-grade tracking integration with deterministic fields.
- DB migration scripts for all schema and status remap changes.
- Full end-to-end regression tests for status transitions + gate behavior + old alias routes.

### Not required but done
- Legacy route aliases maintained to protect current frontend and any existing integrations during transition.
