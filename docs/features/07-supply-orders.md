# 7. Supply Orders (Buying for a Customer)

Sometimes the business does not just ship a customer's goods — it **buys the goods for them** from
a supplier and then ships them. A supply order tracks that purchase from request to delivery.

*Available to administrators, managers and accountants.*

## Creating a supply order

Two ways:

1. **From the Supply Orders page** — fill in the form directly.
2. **While creating a package** — choose *Procured For Customer* as the provision method and the
   purchase details can be entered at the same time. The order and the package are linked
   automatically.

| Field | Notes |
|---|---|
| Customer | Who it is being bought for |
| Supplier | Who it is being bought from |
| Package | Optional at first — the package the goods will travel in |
| Name | What is being bought |
| Purchase price | What the business is paying the supplier |
| Details | Free text — specifications, links, reference numbers |

## The journey of a supply order

```
Draft → Approved → Ordered → Delivered to Warehouse → Packed into Package → Closed
   └────────────────────── Cancelled ──────────────────────┘
```

| Stage | Meaning |
|---|---|
| **Draft** | Being prepared |
| **Approved** | Cleared to buy |
| **Ordered** | Placed with the supplier |
| **Delivered to Warehouse** | Arrived at our warehouse |
| **Packed into Package** | Physically inside the customer's package |
| **Closed** | Finished |
| **Cancelled** | Called off — **a reason is required** |

### Two helpful automatic behaviours

- Marking an order **Delivered to Warehouse** also marks its linked package as **Received** — the
  goods are physically with us, so both records move together.
- **Cancelling** an order **unlinks** it from its package, so the package is not left pointing at a
  purchase that will never arrive. The package itself stays.

## Rules

- An order can only be marked *Packed into Package* if a package is actually linked to it.
- Cancelling always requires a reason, which is stored and shown afterwards.
- Every stage change is recorded with who made it and when.

## What it is not

Supply orders record **what the business paid the supplier**. That figure is kept separate from
what the customer is charged for freight, and the two are not combined anywhere. There is no
supplier payment tracking or purchase-invoice matching.
