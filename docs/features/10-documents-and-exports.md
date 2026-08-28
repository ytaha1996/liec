# 10. Documents & Exports

Every document is produced as an **Excel file**. Clicking the button generates the file and opens
the download; files are kept so a link can be shared afterwards.

Each download is named for what it is and when it was made, for example
`bol-report-BEI-2601-20260822-112137.xlsx`.

*Available to administrators, managers and accountants.*

---

## Shipment documents

Found in the **Shipment Reports** panel on the shipment page.

### Bill of Lading (BOL report)

The container's master document: one row per customer.

| Column | Notes |
|---|---|
| # | Line number |
| Customer | |
| **Priced On** | CBM, Weight, Minimum charge or Custom — why they were charged that way |
| CBM | Volume |
| Weight (Tons) | |
| Rate | The rate applied |
| Freight | Transport charge |
| Fees | Extra charges |
| Discount | Reductions |
| **Total** | Freight + Fees − Discount |
| Notes | The reasons behind any fee or discount |

The header carries the container reference, container (TIIU) code, route, departure and arrival
dates and the currency. A totals row closes the table.

Where one customer has several packages in the container, they appear as a single line with their
figures combined. If those packages were priced differently from one another, *Priced On* reads
**Mixed**.

### Customer Invoices

One worksheet per customer, each showing:

- their name, customer number, phone and the container reference
- total volume and weight, and **what the price was based on**
- **Freight, Fee, Discount and TOTAL** set out separately, with the reason for any adjustment
- the full list of items with quantities and units

A customer whose total is zero shows **FOR FREE** rather than a row of zeros.

### Commercial Invoice + Packing List

The customs pack for the destination country: a commercial invoice with quantities, units and unit
prices converted using the container's frozen exchange rates, and a matching packing list. Invoice
numbers are allocated in sequence per year, so no two documents share a number.

---

## Report exports

Every report on the Reports page has an **Export to Excel** button producing exactly what is on
screen — same columns, same filters, same totals. See [Reports](09-reports.md).

---

## Contact exports (Group Export)

Under **Communications → Group Export**, exports every customer's contact details in either:

- **CSV** — a spreadsheet, for mail-merges and record-keeping
- **VCF** — a phone contacts file, which can be imported into a phone address book in one go so
  customers can be added to WhatsApp broadcast lists by name

There is also a **customers export** producing the full customer list as a spreadsheet.

---

## Conventions used in every document

- **Weight is shown in tons**, to three decimal places (you enter kilograms; documents show tons).
- **Volume is labelled CBM** — cubic metres.
- **Volume comes before weight** in every table.
- **XAF (FCFA) amounts have no decimal places**, because the currency has no smaller unit. Other
  currencies show two.
- Amounts use the currency the container was priced in.
