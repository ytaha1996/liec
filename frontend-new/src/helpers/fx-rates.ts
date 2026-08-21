// FE-side mirror of the backend FxRateService chain-resolution logic.

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
    const toRate = getRateToBase(currencies, toCcy);
    if (toRate === 0) return amount;
    return amount * (fromRate / toRate);
  } catch {
    return amount;
  }
};
