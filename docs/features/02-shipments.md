# 2. Shipments (Containers)

A **shipment** is one container travelling from an origin warehouse to a destination warehouse,
carrying many customers' packages. It is the centre of the system — most work starts by opening a
shipment.

## The shipments list

Shows every container with its reference code, route, dates, status, and how full it is. You can
search, filter by status, sort any column, and click a row to open it.

**Create Shipment** asks for:

| Field | Notes |
|---|---|
| Origin warehouse | Where the container is loaded |
| Destination warehouse | Must be different from the origin |
| Planned departure date | |
| Planned arrival date | |
| Max CBM / Max Weight | The container's limits. Leave at 0 for "no limit" |
| Container (TIIU) code | Optional at creation; required before scheduling |

Each shipment automatically receives a **reference code** like `BEI-2601` — the origin warehouse
code, the year, and a running number. Codes are never reused or duplicated, even if two people
create shipments at the same moment.

## The journey of a container

```
Draft → Scheduled → Ready To Depart → Departed → Arrived → Closed
   └────────── Cancelled ──────────┘
```

| Stage | What it means | What is needed to get here |
|---|---|---|
| **Draft** | Being planned; packages can be added freely | — |
| **Scheduled** | Committed to sail | A valid container (TIIU) code |
| **Ready To Depart** | Loaded and staged | At least one package marked Ready to Ship |
| **Departed** | It has left | **Every package must have a departure photo** |
| **Arrived** | Landed at destination | — |
| **Closed** | Finished and archived | **Every package must have an arrival photo**, and be handed out or cancelled |
| **Cancelled** | Called off | Only from Draft, Scheduled or Ready To Depart |

You cannot skip stages or move backwards. Buttons for stages you cannot reach are simply not
offered.

### What happens at "Ready To Depart"

This is the moment the container is closed off, and the system tidies up for you:

- Packages that **are** ready (marked Ready to Ship) stay and travel.
- Packages that are **not** ready (still Draft, Received or Packed) are **automatically moved to
  the next container on the same route**. If no such container exists, the system creates one.
- The container's used weight and volume are recalculated.

Before you confirm, a **preview** shows exactly which packages will travel and which will be moved,
so there are no surprises. If nothing is ready to ship, the system refuses and tells you so.

### Cancelling a container

Allowed from Draft, Scheduled and Ready To Depart. The confirmation warns you that **every package
under it that has not already shipped will be cancelled too**. Capacity figures are recalculated
afterwards.

## The shipment page

Opening a shipment shows:

- **Shipment Info** — reference, container code, route, planned and actual dates, status. An
  **Edit Info** panel lets you change the container code, dates and limits.
- **Container Capacity** — bars showing used versus maximum CBM and weight, with a warning colour
  as you approach the limit (80% by default).
- **Packages in Shipment** — every package with its customer, volume, weight, charge, status and
  whether its photos are in place. Click a row to open the package; click a customer name to open
  the customer.
- **Financial Summary** — appears once the container has departed.
- **FX Rate Snapshots** — see below.
- **WhatsApp Campaigns** — see [WhatsApp Messaging](08-whatsapp-messaging.md).
- **Shipment Reports** — see [Documents & Exports](10-documents-and-exports.md).
- **Activity Log** — who did what to this shipment, and when.

## Working on many packages at once

Tick the boxes beside packages in the table and an action bar appears. Available actions:

- **Mark Ready to Ship**
- **Mark Arrived**
- **Mark Ready for Handout**
- **Cancel Packages**
- **Move to Next Shipment**

Bulk actions are **all-or-nothing**: the system checks every selected package first, and if even
one fails a rule, nothing changes and you are told which package objected and why. An action is
only offered when every package you selected is eligible for it.

## Moving packages to the next container

Available while the container is Draft, Scheduled or Ready To Depart. Use it when cargo will not
make it into this container after all.

- The packages move to the **next container on the same route**, or a new one is created.
- Packages marked **Ready to Ship revert to Packed**, because the container they are moving to has
  not been scheduled yet. The confirmation says so, and the result message tells you how many
  reverted.
- If the move leaves the original container with **no packages at all, it is cancelled
  automatically**.
- Each package's own history records where it came from and where it went.

## FX rate snapshots

When a container departs and again when it arrives, the system **records the exchange rates in
force at that moment**. This freezes the rates used for that container's paperwork, so invoices
produced later do not silently change value.

Administrators and managers can **override** a captured rate by entering a different one, or remove
an override to fall back to the captured rate. Before departure, the section simply says no
snapshots have been captured yet.
