# 3. Packages

A **package** is one customer's goods within one container. It corresponds to the paper order form
the business has always used. A customer can have several packages in the same container.

> There is no separate "all packages" list. Packages are always reached through their shipment, or
> through search, or from the customer's page. This keeps a package and its container together.

## Creating a package

From the shipment page, click **+ Add Package**:

| Field | Notes |
|---|---|
| Customer | Required. Inactive customers are refused |
| Provision method | *Customer Provided* (they sent it) or *Procured For Customer* (we bought it) |
| CBM and Weight (kg) | Can be filled in later once measured |
| Note | Free text — the business uses this for the order-form number and remarks |
| Items | Contents can be added straight away, or later |

Choosing *Procured For Customer* lets you create the purchase order at the same time — see
[Supply Orders](07-supply-orders.md).

## The journey of a package

```
Draft → Received → Packed → Ready to Ship → Shipped → Arrived at Destination
        → Ready for Handout → Handed Out
   └──────────────── Cancelled ────────────────┘
```

| Stage | Meaning | What is needed |
|---|---|---|
| **Draft** | Recorded, not yet physically in the warehouse | — |
| **Received** | Physically at the warehouse | — |
| **Packed** | Measured and packed | Weight above zero, CBM above zero, and at least one item listed |
| **Ready to Ship** | Cleared to load | **A receiving photo**, and the container must be Scheduled or later |
| **Shipped** | On its way | **A departure photo**, and the container must have departed |
| **Arrived at Destination** | Landed | The container must have arrived |
| **Ready for Handout** | Ready for collection | — |
| **Handed Out** | Given to the customer | **An arrival photo** |
| **Cancelled** | Called off | Only before it ships |

Each step is a button on the package page with a confirmation prompt. Buttons that are not yet
possible are shown greyed out, so you can see what is coming next.

## The package page

Four tabs:

### Overview
Which shipment it belongs to, the **customer (with their customer number, clickable through to
their record)**, provision method, linked supply order, when it was created, and the note. Also the
container's own details, and — for staff who can message — WhatsApp buttons for this one customer.

### Items & Pricing
- **Items** — the contents: goods category, quantity, unit (Box, Piece, Carton, Bag, Pallet,
  Gallon, Bundle), optional unit price and a note. Add them one at a time, or use **Bulk Add** to
  enter several rows in one go. Items can be edited and removed.
- **Pricing Snapshot** — CBM, weight, the rates applied, the charge, **what the price was based
  on**, any fee, any discount, and the **net total**. See [Pricing & Billing](04-pricing-and-billing.md).
- **Edit Weight / CBM / Note** — correct the measurements; the price recalculates.
- **Pricing Override History** — every special rate ever applied, with its reason and date.

### Photos
Photos are grouped by stage: **Receiving, Departure, Arrival** and *Other*. Upload from a phone or
computer, view them full-screen, and delete them if the package has not shipped yet.

- Every photo is **automatically stamped with the customer's name** so it is obvious later which
  cargo it shows.
- Only **JPEG and PNG** are accepted. Photos from iPhones in HEIC format are refused with a clear
  message, because WhatsApp cannot display them.
- The same tab holds **Documents** — PDFs, Word, Excel and PowerPoint files up to 20 MB — for
  customs paperwork and similar.

### Activity
Everything that has happened to this package: status changes, photo and document uploads, price
overrides, fee and discount changes, and moves between containers — each with the date and the
person responsible.

## Photos are not optional

Three moments in the journey are blocked until a photo exists:

| To do this | You need |
|---|---|
| Mark a package Ready to Ship | a **Receiving** photo |
| Depart the container | a **Departure** photo on every package |
| Hand out the goods | an **Arrival** photo |

When a photo is missing, the system does not just refuse — it lists **exactly which packages and
which customers** are missing which photo, so you know what to chase.
