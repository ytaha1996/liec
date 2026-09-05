import { describe, it, expect } from 'vitest';
import { allocationTotal, validateAllocation, type AllocatableInvoice } from '../allocation';

const invoices: AllocatableInvoice[] = [
  { invoiceId: 1, number: 'INV/BEI-2601/001', outstanding: 550_000 },
  { invoiceId: 2, number: 'INV/BEI-2601/002', outstanding: 312_500 },
];

describe('allocationTotal', () => {
  it('treats a blank box as nothing rather than NaN', () => {
    expect(allocationTotal({ 1: '', 2: 100 })).toBe(100);
  });

  it('adds up what has been entered', () => {
    expect(allocationTotal({ 1: 550_000, 2: 312_500 })).toBe(862_500);
  });

  it('is zero when nothing is allocated', () => {
    expect(allocationTotal({})).toBe(0);
  });
});

describe('validateAllocation', () => {
  it('accepts a payment fully allocated across two invoices', () => {
    expect(validateAllocation(862_500, { 1: 550_000, 2: 312_500 }, invoices)).toBeNull();
  });

  it('accepts a part payment, leaving the rest on account', () => {
    expect(validateAllocation(1_000_000, { 1: 550_000 }, invoices)).toBeNull();
  });

  it('accepts a partial allocation against a single invoice', () => {
    expect(validateAllocation(200_000, { 1: 200_000 }, invoices)).toBeNull();
  });

  it('refuses an allocation larger than what the invoice owes', () => {
    // ACC-18: the excess would silently become a credit balance.
    expect(validateAllocation(1_000_000, { 1: 600_000 }, invoices))
      .toBe('INV/BEI-2601/001 only has 550000 outstanding.');
  });

  it('refuses allocating more than was received', () => {
    expect(validateAllocation(500_000, { 1: 400_000, 2: 200_000 }, invoices))
      .toBe('Allocated 600000 is more than the 500000 received.');
  });

  it('refuses a negative allocation', () => {
    expect(validateAllocation(100_000, { 1: -50 }, invoices))
      .toBe('Allocation to INV/BEI-2601/001 must be a positive amount.');
  });

  it('asks for an amount before anything else', () => {
    expect(validateAllocation(0, {}, invoices)).toBe('Enter the amount received.');
    expect(validateAllocation(Number.NaN, {}, invoices)).toBe('Enter the amount received.');
  });

  it('ignores boxes for invoices that are no longer open', () => {
    expect(validateAllocation(100, { 99: 100 }, invoices)).toBeNull();
  });
});
