import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from '../Money';

describe('Money', () => {
  it('shows the amount with its currency', () => {
    render(<Money amount={550000} currency="XAF" />);
    // XAF has no minor unit, so no forced decimals.
    expect(screen.getByText(/550,000/)).toBeTruthy();
    expect(screen.getByText(/550,000/).textContent).not.toContain('.00');
  });

  it('refuses to render an amount with no currency (ACC-14)', () => {
    // The group quotes in XAF, buys in USD and reports in EUR — a bare number
    // is exactly the ambiguity that produced the labelling error.
    render(<Money amount={550000} currency={undefined} />);
    expect(screen.getByText('--')).toBeTruthy();
    expect(screen.queryByText(/550,000/)).toBeNull();
  });

  it('refuses an empty-string currency too', () => {
    render(<Money amount={12} currency="" />);
    expect(screen.getByText('--')).toBeTruthy();
  });

  it('renders nothing meaningful when the amount is missing', () => {
    render(<Money amount={null} currency="XAF" />);
    expect(screen.getByText('--')).toBeTruthy();
  });

  it('renders a legitimate zero rather than treating it as missing', () => {
    render(<Money amount={0} currency="USD" />);
    expect(screen.getByText(/\$0\.00/)).toBeTruthy();
  });

  it('keeps decimals for a currency that has them', () => {
    render(<Money amount={1234.5} currency="USD" />);
    expect(screen.getByText(/\$1,234\.50/)).toBeTruthy();
  });
});
