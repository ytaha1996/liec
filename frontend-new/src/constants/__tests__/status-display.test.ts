import { describe, it, expect } from 'vitest';
import {
  SHIPMENT_STATUS_LABELS, PKG_STATUS_LABELS, SUPPLY_ORDER_STATUS_LABELS,
  PRICING_CONFIG_STATUS_LABELS, PRICE_BASIS_LABELS,
  INVOICE_STATE_LABELS, PAYMENT_STATUS_LABELS,
} from '../statusLabels';
import {
  SHIPMENT_STATUS_CHIPS, PKG_STATUS_CHIPS, SUPPLY_ORDER_STATUS_CHIPS,
  PRICING_CONFIG_STATUS_CHIPS, INVOICE_STATE_CHIPS, PAYMENT_STATUS_CHIPS,
} from '../statusColors';

// The enum values the backend actually emits (Models/Enums.cs and
// Models/Accounting/AccountingEnums.cs). A value the API can send but the UI
// cannot name renders as a blank badge, which reads as "no status" rather than
// as a bug — so this list is the contract.
const BACKEND_VALUES = {
  shipment: ['Draft', 'Scheduled', 'ReadyToDepart', 'Departed', 'Arrived', 'Closed', 'Cancelled'],
  package: ['Draft', 'Received', 'Packed', 'ReadyToShip', 'Shipped', 'ArrivedAtDestination',
    'ReadyForHandout', 'HandedOut', 'Cancelled'],
  supplyOrder: ['Draft', 'Approved', 'Ordered', 'DeliveredToWarehouse', 'PackedIntoPackage',
    'Closed', 'Cancelled'],
  pricingConfig: ['Draft', 'Scheduled', 'Active', 'Retired'],
  priceBasis: ['Unknown', 'Cbm', 'Weight', 'Minimum', 'Custom'],
  invoiceState: ['Draft', 'Posted', 'Cancelled'],
  // Derived by PaymentService.BalanceOfAsync, not an enum — the strings are the
  // contract, and a rename on either side must break this test.
  paymentStatus: ['Unpaid', 'Partially paid', 'Paid'],
};

const cases: Array<[string, string[], Record<string, string>, Record<string, unknown> | null]> = [
  ['shipment status', BACKEND_VALUES.shipment, SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_CHIPS],
  ['package status', BACKEND_VALUES.package, PKG_STATUS_LABELS, PKG_STATUS_CHIPS],
  ['supply order status', BACKEND_VALUES.supplyOrder, SUPPLY_ORDER_STATUS_LABELS, SUPPLY_ORDER_STATUS_CHIPS],
  ['pricing config status', BACKEND_VALUES.pricingConfig, PRICING_CONFIG_STATUS_LABELS, PRICING_CONFIG_STATUS_CHIPS],
  ['invoice state', BACKEND_VALUES.invoiceState, INVOICE_STATE_LABELS, INVOICE_STATE_CHIPS],
  ['payment status', BACKEND_VALUES.paymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_CHIPS],
  // Price basis is rendered as text, not a badge, so it has labels only.
  ['price basis', BACKEND_VALUES.priceBasis, PRICE_BASIS_LABELS, null],
];

describe.each(cases)('%s', (_name, values, labels, chips) => {
  it('names every value the backend can send', () => {
    for (const v of values) {
      expect(labels[v], `no label for "${v}"`).toBeTruthy();
    }
  });

  it('has no label for a value the backend cannot send', () => {
    // A stale key is a rename that was only half-applied.
    expect(Object.keys(labels).sort()).toEqual([...values].sort());
  });

  if (chips) {
    it('colours every value, with both a foreground and a background', () => {
      for (const v of values) {
        const chip = chips[v] as { color?: string; backgroundColor?: string } | undefined;
        expect(chip, `no chip for "${v}"`).toBeTruthy();
        expect(chip!.color, `"${v}" has no text colour`).toMatch(/^#/);
        expect(chip!.backgroundColor, `"${v}" has no background`).toMatch(/^#/);
      }
    });

    it('has no chip for a value the backend cannot send', () => {
      expect(Object.keys(chips).sort()).toEqual([...values].sort());
    });
  }
});

describe('the accounting states read the way Finance says them', () => {
  it('distinguishes a draft from something posted', () => {
    // ACC-04: these two words carry the whole difference between "reviewable"
    // and "history", so neither may be softened.
    expect(INVOICE_STATE_LABELS.Draft).toBe('Draft');
    expect(INVOICE_STATE_LABELS.Posted).toBe('Posted');
  });

  it('gives posted and paid the same settled colour, and unpaid the alarming one', () => {
    expect(INVOICE_STATE_CHIPS.Posted.backgroundColor).toBe(PAYMENT_STATUS_CHIPS.Paid.backgroundColor);
    expect(PAYMENT_STATUS_CHIPS.Unpaid.backgroundColor)
      .not.toBe(PAYMENT_STATUS_CHIPS.Paid.backgroundColor);
    expect(PAYMENT_STATUS_CHIPS['Partially paid'].backgroundColor)
      .not.toBe(PAYMENT_STATUS_CHIPS.Paid.backgroundColor);
  });
});
