# Frontend — Codex Build Instructions (React + TS + MUI)

Implement the admin panel in /frontend exactly per root AGENTS.md.

## STACK
- React + TypeScript + Vite
- MUI theme (single consistent theme)
- React Router
- React Hook Form + Zod
- TanStack Query
- Toast/snackbar notifications

## REQUIRED REUSABLE UI
- Theme module with typography + spacing + consistent component styling
- Reusable RHF components:
  - FormTextField, FormSelect, FormSwitch, FormDateInput
- Reusable dialogs:
  - ConfirmDialog, FormModal
- Reusable info:
  - InfoCard (key/value), StatusChip
  - PhotoGallery that groups by stage and uses image src from `publicUrl`
- Reusable "Form Controller" pattern/hook:
  - loads entity, sets defaults, handles submit, maps server errors

## MEDIA
- Backend returns Media with `publicUrl`. Use it directly for display.
- Upload via multipart/form-data to backend.

## PAGES
- Login
- Dashboard
- Customers (CRUD + consent + detail + WhatsApp individual actions + group helper export UI)
- Warehouses (CRUD)
- GoodTypes + Goods (CRUD)
- Pricing Config (CRUD + activate/retire)
- Shipments:
  - list/filter
  - create + schedule (show RefCode)
  - detail: package table w/ photo flags, aggregated PhotoGallery, status transition buttons with gate error UX,
            WhatsApp bulk actions
- Packages:
  - list/filter
  - detail: receiving photos, packing items + totals + pricing snapshot view, departure photos, arrival photos, handout button
- Suppliers + SupplyOrders
- Messaging Logs (campaigns + delivery logs)

## GATE ERROR UX (CRITICAL)
If API returns HTTP 409 with code PHOTO_GATE_FAILED:
- show an alert with the message
- show a table listing missing packages: packageId, customerRef, stage
- add quick links to each package detail page

## GROUP HELPER EXPORT UI
- Provide button to generate/download CSV or VCF export of opted-in customer primary numbers
- Show a privacy warning: WhatsApp groups reveal phone numbers to all members
- Download should use backend endpoint that returns a PublicUrl; frontend opens that link.

## API CLIENT
- Typed client with auth token injection
- Standardized error parsing for 409/validation errors
- Upload helper

## QUALITY
- Avoid repeated code; use shared components.
- Loading/empty states.
- Clean, admin-friendly layout and navigation.
