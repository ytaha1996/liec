# Proposal-Focused Gap Analysis (Frontend + Backend)

This review compares the current implementation to the **project proposal v2.0** only.

## 1) What is done

### Core platform
- Admin login (JWT) and protected admin UI routing are implemented.
- Master-data CRUD exists for customers, warehouses, good types, goods, pricing configs, suppliers, and supply orders.
- Shipment and package list/detail pages and status transition actions are implemented.
- Package items, pricing snapshot, media upload/listing, and shipment-level aggregated photo views are implemented.
- Messaging logs UI and backend campaign/delivery logging exist.
- Group Helper export exists (CSV/VCF generation + frontend download flow).

### Business rules partially implemented
- Price formula exists and uses `max(weight-based, volume-based)` with rate precedence (Good override -> GoodType -> active pricing defaults).
- Pricing is frozen after shipped via package lock and pricing override controls.
- Photo-gated transitions exist for shipment ship/complete and package handout.
- Capacity tracking exists with thresholds and a `NearlyFull` state.

## 2) What is done but different from the proposal

### Shipment model and statuses
- Implemented status model is container-centric (`Draft, Pending, NearlyFull, Loaded, Shipped, Arrived, Completed, Closed`) instead of proposal lifecycle and wording.
- API action names differ (`activate/load/ship/complete`) versus proposal wording (`schedule/ready-to-depart/depart/close`).

### Ref code format
- Implemented ref code is `YYYY-XX` with global annual sequence.
- Proposal expects origin-prefixed, per-origin annual sequence (example: `BER-2601`).

### Gate payload contract
- Implemented gate missing entries use customer name.
- Proposal expects customer reference identifiers in gate missing payloads.

### Capacity semantics
- Capacity controls are present but implemented on Shipment entity itself (container behavior embedded), not as distinct ShipmentContainer entity from proposal.

## 3) What is missing

### Proposal phase deliverables not implemented
- Invoice/document suite:
  - Packing List
  - Commercial Invoice
  - Customer Invoice
  - Excel reports
  - Compliance declaration generation/print/sign/upload workflow
- Vessel tracking:
  - vessel data fields
  - weekly vessel updates
  - timeline/status logging
- Additional fees:
  - port fees
  - internal transport
  - customs handling
  - miscellaneous fee lines
- Audit system:
  - full change history with old/new values and actor traceability
- Record governance:
  - financial approval/locking workflow and archive controls

### Data model gaps against proposal
- Missing immutable customer business ID (`CustomerRef`).
- Missing customs declared/reduced price persistence model.
- Missing customer-specific stored discount model.
- No dedicated signed-document entities/workflow beyond generic media.

### Workflow/ops gaps
- Proposal rule for maintaining at least two active pending containers is not enforced.
- No dashboard alerting for minimum pending container threshold.

## 4) What is not required (or was future phase) but done

- WhatsApp automation and campaign logging are already implemented, while proposal positions automation under future development.
- Pricing override history with reason is implemented (stronger than baseline proposal text).
- Customer-name watermarking on uploaded images is implemented in backend media processing.

## 5) Business / technical gaps and risks

### High business risk
1. **Ref code non-compliance**: operations won’t get origin/year traceability required by proposal.
2. **Missing financial docs/fees pipeline**: core commercial flow (invoices, customs docs, Excel reporting) is incomplete.
3. **Missing vessel tracking**: shipment ETA/status visibility objective is not met.
4. **Limited auditability**: no full change log undermines dispute handling and compliance.

### Medium technical risk
1. **Contract drift** between backend endpoints/status names and proposal terminology increases training and integration friction.
2. **Gate payload mismatch** reduces operational clarity when resolving missing photo blockers.
3. **Embedded container semantics in shipment** may complicate future expansion if proposal’s explicit container governance is required.

## 6) Priority fix order (proposal-first)
1. Align status model and endpoint contract to proposal wording and transitions.
2. Implement origin-based annual refcode sequencing.
3. Add customer immutable reference and use it in all blocker/gate payloads.
4. Build document generation module (packing list, commercial invoice, customer invoice, Excel).
5. Implement additional fees and invoice composition.
6. Implement vessel tracking timeline and ETA update records.
7. Add full audit/change-log infrastructure and financial lock/archive controls.
8. Add minimum-two-pending-container enforcement + dashboard alerts.
