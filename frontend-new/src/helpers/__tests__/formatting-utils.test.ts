import { describe, it, expect } from 'vitest';
import { formatCurrencyNumber } from '../formatting-utils';

// Intl separates the symbol from the number with a non-breaking space; compare
// on normalised whitespace so the tests assert formatting, not that codepoint.
const money = (v: unknown, ccy: string, d?: number) =>
  formatCurrencyNumber(v, ccy, d).replace(/ /g, ' ');

describe('formatCurrencyNumber', () => {
  // XAF has no minor unit. Forcing two decimals printed every operational
  // amount as "FCFA 550,000.00", which is not how the currency is written.
  it('prints XAF without decimals', () => {
    expect(money(550000, 'XAF')).toBe('FCFA 550,000');
  });

  it('keeps two decimals for currencies that have them', () => {
    expect(money(1234.5, 'USD')).toBe('$1,234.50');
    expect(money(1234.5, 'EUR')).toBe('€1,234.50');
  });

  it('honours an explicit decimal count when a caller insists', () => {
    expect(money(1234.567, 'USD', 3)).toBe('$1,234.567');
  });

  it('shows a dash rather than a misleading zero for missing values', () => {
    expect(formatCurrencyNumber(null, 'XAF')).toBe('--');
    expect(formatCurrencyNumber(undefined, 'XAF')).toBe('--');
    expect(formatCurrencyNumber('', 'XAF')).toBe('--');
  });

  it('falls back readably on an unknown currency code', () => {
    expect(money(100, 'ZZZ')).toContain('100');
  });
});
