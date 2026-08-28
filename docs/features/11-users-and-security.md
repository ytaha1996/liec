# 11. Users, Roles & Security

## The four roles

| Role | Who it is for |
|---|---|
| **Admin** | Full control, including managing staff accounts |
| **Manager** | Runs operations day to day; can do everything except some account administration |
| **Accountant** | Money and paperwork: pricing, reports, invoices. Cannot move cargo through its stages |
| **Field** | Warehouse staff: sees the cargo they are handling and uploads photos. No customer records, no money |

## What each role can reach

| Area | Admin | Manager | Accountant | Field |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ (no money figure) |
| Shipments & Packages | ✅ | ✅ | ✅ | ✅ (view) |
| Reports | ✅ | ✅ | ✅ | ❌ |
| Customers | ✅ | ✅ | ✅ | ❌ |
| Warehouses, Good Types | ✅ | ✅ | ✅ | 👁 view only |
| Pricing, Currencies, Suppliers, Supply Orders | ✅ | ✅ | ✅ | ❌ |
| Messaging Logs, Group Export | ✅ | ✅ | ✅ | ❌ |
| Users | ✅ | ✅ | ❌ | ❌ |

## What each role can do

| Action | Admin | Manager | Accountant | Field |
|---|---|---|---|---|
| Move shipments and packages through their stages | ✅ | ✅ | ❌ | ❌ |
| Create and edit packages, items, weights | ✅ | ✅ | ❌ | ❌ |
| Upload photos | ✅ | ✅ | ❌ | ✅ |
| Apply price overrides, fees and discounts | ✅ | ✅ | ✅ | ❌ |
| Send WhatsApp messages | ✅ | ✅ | ❌ | ❌ |
| Produce documents and exports | ✅ | ✅ | ✅ | ❌ |
| Edit master data | ✅ | ✅ | ❌ | ❌ |
| Manage user accounts | ✅ | ✅ | ❌ | ❌ |

Permissions are enforced in three places: menus hide what you cannot use, addresses typed directly
are refused, and the server checks again before doing anything. Bypassing the screen achieves
nothing.

## Managing users

Under **Admin → Users**: create an account (email, password, role), change someone's role,
deactivate or delete them, and see when each person last signed in.

Two safeguards:

- **You cannot change your own role.** Nobody can quietly promote themselves.
- **The last administrator cannot be removed or demoted.** The system always keeps at least one
  active admin, so you cannot lock everyone out.

## Passwords and sessions

- Passwords are stored **scrambled (hashed)** — nobody, including administrators, can read them.
- Repeated failed sign-ins **temporarily lock** the account.
- Sign-in attempts are **rate-limited** to frustrate automated guessing.
- Sessions last **8 hours**, then require signing in again.
- Anyone can change their own password from their profile, entering the current one first.

## The audit trail

The system keeps a record of who did what. It covers:

- sign-ins, failed sign-ins and lockouts
- user accounts created, changed or removed
- every shipment, package and supply order stage change
- price overrides, fees and discounts, with reasons
- photo and document uploads
- customer changes and consent changes
- master data and currency changes
- exchange-rate overrides
- packages moved between containers

Where it appears: the **Activity Log** on each shipment and package (visible to administrators and
managers), showing the change in plain language — for example *"Moved to another shipment:
BEI-2601 (Ready to Ship) → BEI-2602 (Packed)"*.

## Data safety

- Cancelled shipments and packages are **kept, not deleted** — the history stays intact.
- Photos and documents are stored in secure cloud storage, with each photo stamped with the
  customer's name.
- Reference codes and invoice numbers are allocated so that two people working simultaneously can
  never receive the same number.
