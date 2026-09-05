import { describe, it, expect } from 'vitest';
import { formatNumber, formatPriceWithFlag } from '../format-price';

// Whitespace here is whatever Intl produced — thin and non-breaking spaces
// included — so comparisons normalise it rather than chasing the locale.
const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('formatNumber', () => {
  it('gives XAF no decimals, because FCFA has no minor unit', () => {
    expect(flat(formatNumber(550_000, 'XAF'))).toBe('550,000');
    expect(flat(formatNumber(120_000.4, 'xaf'))).toBe('120,000');
  });

  it('gives every other currency two', () => {
    expect(flat(formatNumber(1234.5, 'USD'))).toBe('1,234.50');
    expect(flat(formatNumber(1234, 'EUR'))).toBe('1,234.00');
  });

  it('formats zero rather than dropping it', () => {
    expect(flat(formatNumber(0, 'XAF'))).toBe('0');
    expect(flat(formatNumber(0, 'USD'))).toBe('0.00');
  });
});

describe('formatPriceWithFlag', () => {
  it('prints the amount plainly when nothing was converted', () => {
    const r = formatPriceWithFlag(550_000, 'XAF');
    expect(flat(r.text)).toBe('550,000 XAF');
    expect(r.converted).toBe(false);
    expect(r.tooltip).toBeUndefined();
  });

  it('marks a converted amount so it is never mistaken for the stored one', () => {
    // The group quotes in XAF and buys in USD; an unmarked figure is exactly
    // the ambiguity that put a wrong number on a document.
    const r = formatPriceWithFlag(330_000, 'XAF', 'USD', 550);
    expect(r.converted).toBe(true);
    expect(flat(r.text)).toBe('≈ 330,000 XAF');
    expect(flat(r.tooltip!)).toBe('Original: 550.00 USD');
  });

  it('treats a matching currency as unconverted regardless of case', () => {
    const r = formatPriceWithFlag(100, 'usd', 'USD', 100);
    expect(r.converted).toBe(false);
    expect(r.text.startsWith('≈')).toBe(false);
  });

  it('uses the symbol when one is supplied', () => {
    expect(flat(formatPriceWithFlag(1234.5, 'USD', null, null, '$').text)).toBe('1,234.50 $');
  });

  it('omits the tooltip when the original amount is unknown', () => {
    // Half a story — "converted from USD, amount unknown" — is worse than none.
    const r = formatPriceWithFlag(330_000, 'XAF', 'USD', null);
    expect(r.converted).toBe(true);
    expect(r.tooltip).toBeUndefined();
  });
});
