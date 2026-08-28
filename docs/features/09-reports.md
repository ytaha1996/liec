# 9. Reports

Reports answer questions that span many containers — "what did this customer ship with us this
year", "which months were busy", "how full do our containers actually go".

*Available to administrators, managers and accountants. Not to warehouse staff, since these show
company-wide money.*

## How the page works

Pick a report from the four cards at the top. Below it:

1. **Filters** — only the ones that apply to the chosen report are shown.
2. **Summary cards** — the totals for everything matching your filters.
3. **The table** — one row per customer, month or container. Sortable, searchable, pageable.
4. **Export to Excel** — downloads exactly what is on screen.

Dates filter on the container's **planned departure date** — the date the business thinks of as
"when it went".

---

## Customer Summary

Every customer, and what they shipped and were billed.

| Column | Meaning |
|---|---|
| Customer | Name and customer number |
| Shipments | How many different containers they appeared in |
| Packages | How many packages in total |
| CBM | Total volume |
| Weight (t) | Total weight in tons |
| Freight | Transport charges before adjustments |
| Fees | Extra charges (customs, handling) |
| Discounts | Reductions given |
| **Total Billed** | Freight + Fees − Discounts |

*Filters: date range, customer, shipment, origin, destination.*

---

## Top Customers by Rate

The best-billing customers, ranked — the analysis the business previously did by hand in the
"Top 15 Client Bonus" spreadsheet.

Alongside the same volume and billing figures it adds:

- **Per CBM** — how much each cubic metre of their cargo earned
- **Per Ton** — how much each ton earned

These reveal which customers are genuinely profitable, not merely large. Two customers can bill
the same amount while one occupies twice the container space.

*Filters: date range, origin, destination, and how many to list (15 by default).*

---

## Revenue by Month

One row per month: containers, packages, volume, weight, freight, fees, discounts and total
billed. Shows the trend across a year and makes seasonal patterns visible.

*Filters: date range, customer, origin, destination.*

---

## Container Utilisation

How full each container actually went.

| Column | Meaning |
|---|---|
| Shipment / Route / Status | Which container, and where it went |
| Customers / Packages | How many it carried |
| CBM Used vs CBM Max | Volume used against the container's limit |
| **% Full (CBM)** | The percentage that represents |
| Weight vs Weight Max, **% Full (Weight)** | The same for weight |
| Total Billed | What the container earned |

A container showing 40% full earned far less than it could have. Where no limit was set on the
container, the percentage shows a dash rather than a misleading figure.

*Filters: date range, shipment status, origin, destination.*

---

## Things worth knowing

- **Cancelled packages are excluded** from every report — they never travelled and were never
  billed.
- **The reports agree with each other.** Customer Summary and Revenue by Month over the same period
  always produce the same grand total; they are two views of one set of figures.
- **"Total Billed" means invoiced, not collected.** The system does not record payments received.
- Each export is named after its report and the moment it was produced, e.g.
  `customer-summary-20260822-123020.xlsx`.
