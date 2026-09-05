# 4. Pricing & Billing

## How a price is worked out

Every package is priced from the **active rate table** (see [Master Data](06-master-data.md)),
which holds a rate per cubic metre, a rate per kilogram, and an optional minimum charge.

The system charges **whichever side is worth more**:

```
Freight = the larger of  (weight in kg × rate per kg)
                    and  (volume in m³ × rate per m³)
```

Then, if the rate table sets a **minimum charge** and the result is below it, the minimum applies.

**Why both?** Cargo can be heavy and small, or light and bulky. Charging on volume alone would give
away heavy freight; charging on weight alone would give away bulky freight. Taking the larger of
the two reflects what the container actually costs.

### A worked example, using the real 925 tariff
*(275,000 CFA per m³, 500 CFA per kg, minimum 120,000 CFA)*

| Customer | Volume | Weight | By volume | By weight | Charged | Priced on |
|---|---|---|---|---|---|---|
| ALI FARHAT | 2 m³ | 285 kg | 550,000 | 142,500 | **550,000** | CBM |
| GHASSAN GHANDOUR | 0.75 m³ | 625 kg | 206,250 | 312,500 | **312,500** | Weight |
| HASSAN AWDE | 0.13 m³ | 74 kg | 35,750 | 37,000 | **120,000** | Minimum |

## "Priced On" — why a customer was charged that way

Every package records which side decided its price. You see it on the package page, on the Bill of
Lading beside the customer, and in reports.

| Priced On | Meaning |
|---|---|
| **CBM** | Volume was worth more |
| **Weight** | Weight was worth more |
| **Minimum charge** | Too small to reach the minimum, so the minimum applied |
| **Custom** | Someone set the total by hand |

## Special rates (overrides)

Regular customers and negotiated deals are handled with **overrides**, available to
administrators, managers and accountants:

| Override | Use it when |
|---|---|
| **Rate per CBM** | This customer has a different per-m³ rate (e.g. 250,000 instead of 275,000) |
| **Rate per Kg** | This customer has a per-ton deal |
| **Total charge** | The total is negotiated outright, including "free of charge" |

Every override **requires a reason**, and all of them are kept in the package's Pricing Override
History with the old value, the new value, the reason, and who did it.

Once a package has an override, routine recalculation leaves it alone — a later edit to weight
cannot silently wipe out a negotiated price.

## Fees and discounts

Separate from the freight, each package can carry **one fee** and **one discount**, each with a
reason. This mirrors the FEES column on the paper Bill of Lading.

```
Total Billed  =  Freight  +  Fee  −  Discount
```

Typical uses, taken from real paperwork:

- a customs declaration charge at the port (+70,000 CFA)
- rounding the invoice to a clean figure (+500, or −500)
- a goodwill reduction for a long-standing customer

Rules the system enforces:

- Fees and discounts cannot be negative.
- If an amount is entered, **a reason is required**.
- A discount **cannot exceed the freight plus the fee** — the total can never go below zero.
- Nothing can be changed once the goods have been handed out.
- Every change is recorded in the package's Activity log.

**Why keep them separate from the freight?** Because folding a customs charge into the freight
hides it. Keeping them apart means the invoice can show the customer what they are paying for, the
freight figure stays comparable between customers, and recalculating the price never erases a fee.

## When the price is fixed

- The price is calculated when the package is created and again when it is packed or measured.
- Once the goods have **arrived at destination**, the price stops recalculating — it is committed
  for customs and invoicing. Changes from that point go through an override.
- A container's **exchange rates are frozen** at departure and arrival, so paperwork produced later
  keeps the values that applied at the time.

## Currency

All amounts on a container use the currency of the rate table that priced them — normally **XAF
(FCFA)**, which is shown without decimal places because it has no smaller unit. Other currencies
show two decimals.
