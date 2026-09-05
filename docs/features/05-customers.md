# 5. Customers

Customer records are the address book of the business. Every package belongs to a customer, and
every invoice is addressed to one.

*Available to administrators, managers and accountants. Warehouse staff (Field) do not have access
to customer records — where a customer name appears elsewhere for them, it shows as plain text
rather than a link.*

## The customer list

A searchable, sortable table of every customer. **Create Customer** and the edit form capture:

| Field | Notes |
|---|---|
| Name | Required — the name used on the Bill of Lading and invoices |
| Primary phone | Required. Must be a full international number (e.g. `+24106644300`). This is the WhatsApp number |
| Email | Optional |
| Company name | Optional |
| Tax ID | Optional — for customs paperwork |
| Billing address | Optional |
| Active | Inactive customers cannot have new packages created for them |

Each customer has a **customer number** (e.g. `#28`). This is the code quoted on order forms, so
the system shows names as **`ABBAS HIJAZI (#28)`** wherever it helps staff match paperwork.

## The customer page

- **Customer Info** — everything above, with an edit button.
- **WhatsApp Consent** — see below.
- **Individual WhatsApp** — send this one customer a status update or a photo set for a chosen
  shipment.
- **Packages** — every package this customer has ever had, with its container and status. Click
  through to any of them.

## WhatsApp consent

The business must not message people who have not agreed to it. Each customer has three separate
permissions, and the system checks them before every send:

| Permission | Controls |
|---|---|
| **Status updates** | "Your shipment has departed" messages |
| **Departure photos** | Photos of goods being loaded |
| **Arrival photos** | Photos of goods on arrival |

A customer might accept status updates but not photos — each is honoured independently. A consent
record is created automatically with every new customer, and every change is logged.

If a customer has not opted in, messages to them are **skipped and recorded as "Skipped — not
opted in"**, so it is clear afterwards that they were deliberately left out rather than failed.

## Where customers appear elsewhere

- The **shipment page** lists the customer for every package, clickable through to their record.
- The **package page** shows the customer with their number, also clickable.
- **Quick search** (Ctrl+K) finds customers by name.
- The **Customer Summary report** gives each customer's volume, weight and billing across all
  containers — see [Reports](09-reports.md).
- **Group Export** produces a contacts file of all customers for use in phone address books or
  broadcast lists — see [Documents & Exports](10-documents-and-exports.md).
