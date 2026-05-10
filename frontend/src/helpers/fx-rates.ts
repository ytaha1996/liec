// FE-side mirror of the backend FxRateService chain-resolution logic.
// Takes a list of Currency objects (as returned by GET /api/currencies) and a
// currency code; returns "1 unit of code = X units of base" by walking the
// AnchorCurrencyCode chain to the base currency.

export interface CurrencyRow {
  id: number;
  code: string;
  name: string;
  symbol?: string | null;
  isBase: boolean;
  anchorCurrencyCode?: string | null;
  rate?: number | null;
  isActive: boolean;
}

export const getRateToBase = (currencies: CurrencyRow[], code: string): number => {
  const visited = new Set<string>();
  const resolve = (c: string): number => {
    if (visited.has(c.toUpperCase())) {
      throw new Error(`Currency anchor cycle detected at '${c}'.`);
    }
    visited.add(c.toUpperCase());
    const row = currencies.find((x) => x.code.toUpperCase() === c.toUpperCase());
    if (!row) throw new Error(`Currency '${c}' not found.`);
    if (row.isBase) return 1;
    if (!row.anchorCurrencyCode || row.rate == null) {
      throw new Error(`Non-base currency '${c}' must have anchorCurrencyCode and rate.`);
    }
    return row.rate * resolve(row.anchorCurrencyCode);
  };
  return resolve(code);
};

/**
 * Convert `amount` from `fromCcy` to `toCcy` using the chained rates.
 * Returns the amount unchanged when from/to match (case-insensitive) or when
 * the rate lookup fails (best-effort: the FE never throws on missing rates).
 */
export const convertPrice = (
  currencies: CurrencyRow[],
  amount: number,
  fromCcy: string,
  toCcy: string,
): number => {
  if (amount === 0) return 0;
  if (fromCcy.toUpperCase() === toCcy.toUpperCase()) return amount;
  try {
    const fromRate = getRateToBase(currencies, fromCcy);
    const toRate   = getRateToBase(currencies, toCcy);
    if (toRate === 0) return amount;
    return amount * (fromRate / toRate);
  } catch {
    return amount;
  }
};
