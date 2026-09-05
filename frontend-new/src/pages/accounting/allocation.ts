export interface AllocatableInvoice {
  invoiceId: number;
  number: string;
  outstanding: number;
}

export type AllocationMap = Record<number, number | ''>;

/** What has been put against invoices so far; blanks count as nothing. */
export function allocationTotal(allocations: AllocationMap): number {
  return Object.values(allocations).reduce<number>(
    (sum, v) => sum + (v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v)),
    0,
  );
}

/**
 * ACC-18: the allocation is checked before it is sent, so an over-payment is a
 * message the operator can act on rather than a server error. Returns the
 * problem, or null when the allocation is sound.
 */
export function validateAllocation(
  amount: number,
  allocations: AllocationMap,
  invoices: AllocatableInvoice[],
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount received.';

  for (const [key, value] of Object.entries(allocations)) {
    if (value === '' || value == null) continue;
    const v = Number(value);
    const invoice = invoices.find((i) => i.invoiceId === Number(key));
    if (!invoice) continue;
    if (!Number.isFinite(v) || v < 0) return `Allocation to ${invoice.number} must be a positive amount.`;
    // Allocating more than an invoice owes is a data-entry slip, not something
    // to absorb — the excess would silently become a credit balance.
    if (v > invoice.outstanding) {
      return `${invoice.number} only has ${invoice.outstanding} outstanding.`;
    }
  }

  const allocated = allocationTotal(allocations);
  if (allocated > amount) {
    return `Allocated ${allocated} is more than the ${amount} received.`;
  }
  return null;
}
