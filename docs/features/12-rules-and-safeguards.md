# 12. Rules the System Enforces

Every check the system makes, why it exists, and what you will see. If something is refused, the
reason is here.

## Photo requirements

| Blocked action | Requirement | Why |
|---|---|---|
| Mark a package **Ready to Ship** | A **receiving** photo | Proof of the condition goods arrived in |
| **Depart** a container | A **departure** photo on *every* package | Proof of what was loaded, if a claim follows |
| **Hand out** goods | An **arrival** photo | Proof of the condition handed over |

When blocked, the system lists **which packages, which customers and which photo is missing** —
not just a refusal.

## Stage rules

- Stages run in one direction. There is no "undo" from Shipped back to Packed.
- **Packing** requires weight above zero, volume above zero, and at least one item listed.
- A package cannot be **Ready to Ship** unless its container is Scheduled or later.
- A package cannot be **Shipped** unless its container has departed.
- A package cannot be marked **Arrived** unless its container has arrived.
- **Scheduling** a container requires a valid container (TIIU) code.
- **Ready To Depart** requires at least one package ready to ship.
- **Closing** a container requires every package to be handed out or cancelled, with arrival photos.
- **Cancelling** is only possible before goods ship.

## Money rules

- Fees and discounts cannot be negative.
- A reason is required whenever a fee or discount is entered.
- A discount cannot exceed freight plus fee — a total can never go below zero.
- Every price override requires a reason.
- Pricing stops recalculating once goods arrive at destination.
- Pricing is not recalculated on packages with an override — a negotiated price cannot be
  accidentally overwritten.
- Nothing about pricing can change once goods are handed out.

## Data rules

- Warehouse codes and currency codes are unique.
- Container reference codes and invoice numbers are unique, even under simultaneous use.
- A container's origin and destination must differ.
- Packages cannot be created for an inactive customer.
- A currency in use cannot be deleted.
- Only one rate table is active at a time; activating one retires the others.
- Phone numbers must be full international numbers.
- Photos must be JPEG or PNG; HEIC (iPhone) is refused with an explanation.
- Documents are limited to 20 MB.

## Bulk action rules

Bulk actions are **all-or-nothing**. Every selected package is checked first; if one fails, nothing
changes and the message names the package and the reason. This avoids half-finished batches where
some packages moved and others did not.

## Automatic tidying

Things the system does for you, so records do not drift out of step:

| When | What happens |
|---|---|
| A container is marked Ready To Depart | Packages that are not ready move to the next container on that route (created if none exists) |
| Packages are moved to the next container | Ready-to-ship packages revert to Packed, since the new container has not been scheduled |
| A move empties a container | That container is cancelled automatically |
| A container is cancelled | Every package that has not shipped is cancelled too |
| A supply order is delivered | Its linked package is marked Received |
| A supply order is cancelled | It is unlinked from its package; the package remains |
| A package is cancelled | Its supply order is unlinked and container capacity recalculated |
| Anything changes weight or volume | Container capacity figures are recalculated |
| A container departs or arrives | Exchange rates are captured and frozen |

## Account safeguards

- You cannot change your own role.
- The last administrator cannot be deleted or demoted.
- Repeated failed sign-ins lock an account temporarily.

## Warnings rather than blocks

Some things inform without stopping you:

- **Capacity** — a container filling past 80% shows a warning colour, but you may still load it.
  The business, not the software, decides what fits.
- **Missing measurements** — a package with no weight or volume is priced at zero rather than
  refused, so it can be recorded on arrival and measured later.
