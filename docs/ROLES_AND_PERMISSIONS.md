# Roles & Permissions — Current State + Gap Analysis

> Audited 2026-07-24 against `backend/ShippingPlatform.Api` (controllers + business layer),
> `frontend/` (MUI, primary) and `frontend-new/` (shadcn rewrite).

## The four roles

| Role | Intent |
|---|---|
| **Admin** | Full control, including user management |
| **Manager** | Day-to-day operations — everything except user/role administration |
| **Accountant** | Read business data, pricing overrides, exports; no operational writes |
| **Field** | Warehouse staff — view ops data, upload/delete package photos; nothing else |

Roles live in `Models/Enums.cs` (backend enum) and `helpers/rbac.ts` (both frontends).
The JWT carries the role in the standard `ClaimTypes.Role` claim (8-hour expiry, no revocation —
a role change takes effect on next login).

---

## What each role CAN and CANNOT do (as enforced by the backend today)

### Admin
**Can:** everything below plus — create/edit/delete users, change other users' roles, dev-only data reset.
**Cannot:** change their own role, delete their own account, deactivate/delete the last active admin.

### Manager
**Can:**
- All shipment operations: create, schedule, ready-to-depart, depart, arrive, close, cancel, edit, bulk package transitions, FX snapshot overrides
- All package operations: create, auto-assign, all status transitions, items CRUD, weight/CBM edit, documents upload/delete
- Photos: upload + delete
- Master data writes: customers, warehouses, good types, suppliers, supply orders, currencies (incl. delete), WhatsApp consent
- Pricing: config create/edit/activate/retire, per-package pricing overrides
- WhatsApp sends (bulk + individual), campaign logs
- All exports (BOL, invoices, commercial docs, customers Excel, group helper)
- Audit logs (shipment + package), **view** user roster (read-only)

**Cannot:** create/edit/delete users or change roles (Admin only), dev reset.

### Accountant
**Can:**
- Read: shipments, packages, customers, suppliers, supply orders, pricing configs, warehouses, good types, currencies, campaign logs, stats
- Per-package **pricing overrides** (rate per kg / per CBM / total charge)
- All exports (BOL, customer invoices, commercial documents, customers Excel, group helper)
- ⚠️ Pricing config **create/edit/activate/retire** (see Gap B1 — likely unintended)
- ⚠️ FX rate overrides via the commercial-documents export body (see Gap B2 — write disguised as export)

**Cannot:**
- Any shipment/package/supply-order status transition
- Any master data write (customers, warehouses, suppliers, currencies, …)
- Photo upload, WhatsApp sends, user management, audit logs

### Field
**Can:**
- Read: shipments, packages, warehouses, good types, dashboard stats, currencies/units lookups, package media/documents/pricing-overrides (read), FX snapshots (read)
- **Upload and delete package photos** (their core job)
- Change their own password

**Cannot:**
- Everything else: all transitions, all master data, customers (read included), suppliers, supply orders, pricing configs, exports, WhatsApp, users, audit logs

---

## Permission matrix (backend enforcement)

Legend: ✅ allowed · ❌ denied · ⚠️ allowed but flagged as a gap

| Capability | Admin | Manager | Accountant | Field |
|---|:-:|:-:|:-:|:-:|
| **Auth** |
| Login / change own password | ✅ | ✅ | ✅ | ✅ |
| **Users** |
| View user roster | ✅ | ✅ | ❌ | ❌ |
| Create / edit / delete users, set roles | ✅ | ❌ | ❌ | ❌ |
| **Shipments** |
| View list/detail | ✅ | ✅ | ✅ | ✅ |
| Create / edit / all transitions / cancel | ✅ | ✅ | ❌ | ❌ |
| Bulk package transitions | ✅ | ✅ | ❌ | ❌ |
| FX snapshot override (PUT/DELETE) | ✅ | ✅ | ❌ | ❌ |
| View FX snapshots | ✅ | ✅ | ✅ | ✅ |
| Shipment audit log | ✅ | ✅ | ❌ | ❌ |
| **Packages** |
| View list/detail (incl. charge amounts) | ✅ | ✅ | ✅ | ✅ |
| Create / edit / all transitions | ✅ | ✅ | ❌ | ❌ |
| Items add/edit/delete (single + bulk) | ✅ | ✅ | ❌ | ❌ |
| Photos upload/delete | ✅ | ✅ | ❌ | ✅ |
| Documents upload/delete | ✅ | ✅ | ❌ | ❌ |
| Pricing override (apply) | ✅ | ✅ | ✅ | ❌ |
| Pricing overrides (view history) | ✅ | ✅ | ✅ | ✅ |
| Package audit log | ✅ | ✅ | ❌ | ❌ |
| **Customers** |
| View | ✅ | ✅ | ✅ | ❌ |
| Create / edit / WhatsApp consent | ✅ | ✅ | ❌ | ❌ |
| **Master data** (warehouses, good types) |
| View | ✅ | ✅ | ✅ | ✅ |
| Create / edit | ✅ | ✅ | ❌ | ❌ |
| **Suppliers / Supply orders** |
| View | ✅ | ✅ | ✅ | ❌ |
| Write + lifecycle | ✅ | ✅ | ❌ | ❌ |
| **Pricing configs** |
| View | ✅ | ✅ | ✅ | ❌ |
| Create / edit / activate / retire | ✅ | ✅ | ⚠️ (B1) | ❌ |
| **Currencies** |
| View | ✅ | ✅ | ✅ | ✅* |
| Create / edit / delete | ✅ | ✅ | ❌ | ❌ |
| **WhatsApp** |
| Bulk + individual sends | ✅ | ✅ | ❌ | ❌ |
| Campaign logs | ✅ | ✅ | ✅ | ❌ |
| **Exports** (BOL, invoices, commercial docs, contacts) | ✅ | ✅ | ✅ | ❌ |
| — commercial-docs export can write FX overrides | ✅ | ✅ | ⚠️ (B2) | ❌ |
| **Dashboard stats** (incl. `totalPendingCharges`) | ✅ | ✅ | ✅ | ⚠️ (B3) |
| **Dev reset** (Development env only) | ✅ | ❌ | ❌ | ❌ |

\* Currencies GET is intentionally open to Field: PackageDetailPage (visible to Field) needs the FX list to render converted unit prices.

---

## Frontend enforcement (UI gating)

Both frontends share the same `MODULE_ACCESS` matrix and 13 `can*` helpers — logic is identical.
Nav/module visibility matches in both. Route-level enforcement differs (see Gap F1).

| Module route | Admin | Manager | Accountant | Field |
|---|:-:|:-:|:-:|:-:|
| /ops/* (dashboard, shipments, packages) | ✅ | ✅ | ✅ | ✅ |
| /master/warehouses, /master/good-types | ✅ | ✅ | ✅ | ✅ |
| /master/customers, pricing, suppliers, supply-orders, currencies | ✅ | ✅ | ✅ | ❌ |
| /comms/* | ✅ | ✅ | ✅ | ❌ |
| /admin/users | ✅ | ✅ | ❌ | ❌ |

---

# GAPS

## Backend gaps

### 🔴 B1 — Accountant can create/edit/**activate**/retire pricing configs
`PricingConfigController.cs` has class-level `[Authorize(Roles="Admin,Manager,Accountant")]` and **no
method-level override on the four write endpoints**. Every other master-data controller restricts
writes to `Admin,Manager`. An Accountant can change the default rates that drive every charge.
The frontend agrees writes should be Admin/Manager only (`canWriteMasterData`).
**Fix:** add `[Authorize(Roles="Admin,Manager")]` to POST, PUT, `/activate`, `/retire`.

### 🔴 B2 — Commercial-documents export writes FX overrides under Accountant
`ExportsController.cs:25-40` — the export body accepts `RateOverrides` and persists them via
`fxSnap.UpsertManualAsync(...)`. The dedicated FX endpoint (`PUT /api/shipments/{id}/fx-snapshots/{code}`)
requires `Admin,Manager`, but this path lets an Accountant do the same write.
**Fix:** apply `RateOverrides` only when the caller is Admin/Manager; ignore (or 403) otherwise.

### 🟠 B3 — `/api/stats/overview` exposes financial totals to Field
No role attribute; the payload includes `totalPendingCharges`. Field staff shouldn't see company
financial aggregates (they can't see pricing configs or customer data anywhere else).
**Fix:** keep the endpoint for all roles (dashboard is a Field module) but omit `totalPendingCharges`
when the caller is Field. Frontend hides the card when the field is absent.

### 🟠 B4 — Weak default JWT secret fallback
`Program.cs:42` + `Services.cs:18` fall back to the literal `"dev-secret-super-long"` when
`Auth:Secret` is missing. If any environment boots without the setting, tokens are forgeable
(role=Admin). **Fix:** throw at startup in non-Development environments when `Auth:Secret` is
missing/short instead of silently falling back.

### 🟡 B5 — Last-admin guard doesn't cover role demotion
`BusinessServices.cs:213-218` blocks deactivating/deleting the last active admin but not demoting
one to a lower role. Not directly exploitable (self-role-change is blocked, so the acting Admin
always remains), but asymmetric. **Fix:** extend the `LAST_ADMIN` check to role changes away from Admin.

### 🟡 B6 — Audit attribution falls back to user id 1
`PackagesController.cs:145` and `WhatsAppController.cs:12` default the actor to `1` when the
NameIdentifier claim fails to parse — silently crediting actions to the seed admin.
**Fix:** use nullable actor id (pattern already used elsewhere in the same controller).

## Frontend gaps

### 🔴 F1 — `frontend-new` has NO route-level role enforcement (port regression)
`RequireAuth` checks only `isAuthenticated`; `App.tsx` registers every route unconditionally.
A Field user can type `/admin/users`, `/master/pricing-configs`, `/comms/group-helper-export`, etc.
and the pages render (read-only data included). The MUI app's `Protected.tsx` gates each route via
`MODULE_ACCESS` — this was not ported.
**Fix:** add a `RequireModule` wrapper in `frontend-new` that checks `canSee(role, module)` and
redirects to 404/dashboard, mirroring `Protected.tsx`.

### 🔴 F2 — PricingConfigsPage has zero role checks (BOTH apps)
Create/Edit/Activate/Retire buttons render for anyone who can open the page (Accountant today;
plus Field in frontend-new via F1). **Fix:** gate all four actions behind `canWriteMasterData` in
both apps (pairs with B1).

### 🟠 F3 — GroupHelperExportPage buttons not gated by `canExport` (BOTH apps)
Harmless in the MUI app (module access ≙ canExport), but in frontend-new + F1 a Field user can
trigger the customer-phone-number export. **Fix:** wrap buttons in `canExport`; primary fix is F1.

### 🟠 F4 — MUI CustomerDetailPage "Individual WhatsApp" not gated
`frontend/src/pages/customers/CustomerDetailPage.tsx:269-300` shows send buttons without
`canSendWhatsApp` — an Accountant can trigger sends the backend… actually **backend blocks it**
(individual sends are `Admin,Manager`), so the Accountant gets a 403 toast. UI-only defect.
frontend-new already gates this correctly. **Fix:** wrap the section in `canSendWhatsApp`.

### 🟡 F5 — Feature parity: bulk package transitions missing in frontend-new
`canBulkTransitionPackages` gated bulk actions exist only in the MUI ShipmentDetailPage. Port when
frontend-new becomes primary (not a security issue).

### 🟡 F6 — Feature parity: PackageDocuments missing in frontend-new
Document upload/list/delete section not ported. Backend endpoints exist and are properly gated.

## Non-gaps (reviewed, intentionally accepted)

- Field reading package charge amounts / pricing-override history / FX snapshots — package detail
  is a Field surface; pricing display is part of it by design.
- Currencies GET open to Field — required for FX display on package detail.
- Manager viewing (not editing) the user roster — `users` module intentionally includes Manager.
- No token revocation on role change — 8 h max staleness, acceptable at current scale.

---

# Remediation status

| # | Fix | Where | Status |
|---|---|---|---|
| 1 | **F1**: `RequireModule` route guard | `frontend-new` App.tsx + `components/layout/RequireModule.tsx` | ✅ Fixed |
| 2 | **B1 + F2**: pricing-config writes → Admin/Manager, gate UI buttons | PricingConfigController + both PricingConfigsPages | ✅ Fixed |
| 3 | **B2**: RateOverrides only for Admin/Manager in commercial-docs export (403 otherwise) | ExportsController | ✅ Fixed |
| 4 | **B4**: fail-fast on missing/short Auth:Secret outside Development | Program.cs | ✅ Fixed |
| 5 | **B3**: `totalPendingCharges` omitted for Field; dashboards hide the card when absent | StatsController + both DashboardPages | ✅ Fixed |
| 6 | **F3**: `canExport` on GroupHelperExportPage buttons (both apps) | 2 pages | ✅ Fixed |
| 7 | **F4**: `canSendWhatsApp` on MUI CustomerDetailPage | 1 page | ✅ Fixed |
| 8 | **B5**: last-admin guard now also blocks role demotion of the last active admin | UserBusiness | ✅ Fixed |
| 9 | **B6**: malformed tokens rejected (401) instead of attributing actions to user #1 | PackagesController + WhatsAppController | ✅ Fixed |
| 10 | **F5/F6**: port bulk transitions + PackageDocuments to frontend-new | frontend-new | ⏳ Parity backlog |

With 1–9 applied, the ⚠️ entries in the matrix above are resolved: pricing-config writes and FX
overrides are Admin/Manager only everywhere, Field no longer sees financial totals, and
`frontend-new` enforces module access at the route level like the MUI app.
