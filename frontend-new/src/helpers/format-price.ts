// XAF (FCFA) is a no-decimal currency in practice; everything else gets two.
const decimalsFor = (ccy: string): number =>
  ccy.toUpperCase() === 'XAF' ? 0 : 2;

export const formatNumber = (amount: number, ccy: string): string =>
  amount.toLocaleString(undefined, {
    minimumFractionDigits: decimalsFor(ccy),
    maximumFractionDigits: decimalsFor(ccy),
  });

export interface PriceFlag {
  text: string;
  converted: boolean;
  tooltip?: string;
}

// Renders a price for the active display currency, marking it visibly when it
// was converted from a different stored currency.
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
  const tooltip =
    converted && storedAmount != null
      ? `Original: ${formatNumber(storedAmount, storedCcy!)} ${storedCcy}`
      : undefined;
  return { text, converted, tooltip };
};
