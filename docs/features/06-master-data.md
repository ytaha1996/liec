# 6. Master Data

The reference lists the rest of the system draws on. Set up once, changed rarely.

*All of these are visible to administrators, managers and accountants. Warehouse staff can view
Warehouses and Good Types but cannot change them.*

---

## Warehouses

The origins and destinations containers travel between.

| Field | Notes |
|---|---|
| Code | Up to 3 letters, unique — e.g. `BEI`, `GAB`, `CHN`, `DXB`. Used to build shipment reference codes |
| Name | e.g. "Beirut Warehouse" |
| City, Country | Used on paperwork |
| Max weight / Max CBM | Default limits offered when creating a container from here |
| Active | Inactive warehouses stop appearing in dropdowns |

Four are supplied ready to use: **Beirut (BEI), Gabon (GAB), China (CHN), Dubai (DXB)**.

---

## Good Types

The categories used to describe package contents.

| Field | Notes |
|---|---|
| Name (English) | Shown throughout the system |
| Name (Arabic) | Shown alongside on customs paperwork |
| Can break | Marks fragile goods |
| Can burn | Marks flammable goods |
| Rate per kg / per m³ | **Optional.** If set, this category is priced at its own rate instead of the standard one |
| Active | |

Twelve are supplied: Electronics, Clothing, Food Items, Documents, Furniture, Cosmetics, Tools &
Equipment, Medical Supplies, Books & Stationery, Toys & Games, Jewelry & Watches, Automotive Parts.

---

## Pricing (rate tables)

The tariff used to price freight. Each rate table holds:

| Field | Notes |
|---|---|
| Name | e.g. "Standard XAF Rate" |
| Currency | Must be an active currency |
| Effective from / to | The period it covers |
| Default rate per m³ | e.g. 275,000 |
| Default rate per kg | e.g. 500 |
| Minimum charge | Optional. Small cargo is charged at least this much (e.g. 120,000) |
| Status | Draft → Scheduled → Active → Retired |

**Only one rate table is active at a time.** Activating a new one automatically retires the old
one, so there is never ambiguity about which prices apply. Creating and activating are recorded in
the audit trail.

---

## Suppliers

Vendors used when the business buys goods for a customer. Name, email, active flag. Used by
[Supply Orders](07-supply-orders.md).

---

## Currencies

The currencies the business deals in, and how they relate to each other.

| Field | Notes |
|---|---|
| Code | ISO code — USD, EUR, XAF |
| Name, Symbol | Symbol appears on invoices (e.g. FCFA) |
| Base currency | Exactly one currency is the base everything else is measured against |
| Anchor currency + rate | For non-base currencies: what it is pegged to, and at what rate |
| Active | |

Currencies form a chain back to the base, so any amount can be expressed in any currency. A
currency that is in use cannot be deleted.

Rates in force are **captured when a container departs and arrives**, so historical paperwork keeps
its original values — see FX snapshots in [Shipments](02-shipments.md).
