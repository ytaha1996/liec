// XAF (FCFA) is a no-decimal currency in practice; everything else gets two.
const decimalsFor = (ccy: string): number =>
  ccy.toUpperCase() === 'XAF' ? 0 : 2;

export const formatNumber = (amount: number, ccy: string): string =>
  amount.toLocaleString(undefined, {
    minimumFractionDigits: decimalsFor(ccy),
    maximumFractionDigits: decimalsFor(ccy),
  });

export interface PriceFlag {
  text: string;          // ready-to-render string (e.g. "≈ 656,000 FCFA")
  converted: boolean;    // true when displayCcy ≠ storedCcy
  tooltip?: string;      // populated when converted; reveals the original
}

/**
 * Renders a price for the active display currency, marking it visibly when it
 * was converted from a different stored currency. Pair with a MUI <Tooltip>
 * to surface the original on hover.
 */
export const formatPriceWithFlag = (
  amount: number,
  displayCcy: string,
  storedCcy?: string | null,
  storedAmount?: number | null,
  displaySymbol?: string,
): PriceFlag => {
  const symbol = displaySymbol ?? displayCcy;
  const converted = !!storedCcy && storedCcy.toUpperCase() !== displayCcy.toUpperCase();
  const text = `${converted ? '≈ ' : ''}${formatNumber(amount, displayCcy)} ${symbol}`;
  const tooltip = converted && storedAmount != null
    ? `Original: ${formatNumber(storedAmount, storedCcy!)} ${storedCcy}`
    : undefined;
  return { text, converted, tooltip };
};
