import { formatCurrencyNumber } from '@/helpers/formatting-utils';

interface MoneyProps {
  amount: number | null | undefined;
  currency: string | null | undefined;
  /** Muted styling for zero/neutral figures. */
  muted?: boolean;
  className?: string;
}

/**
 * ACC-14: an amount is never shown without the currency it is in. The group
 * quotes in XAF, buys in USD and reports in EUR — a bare "550,000" on a screen
 * is the ambiguity that produced the $6.3M labelling error, so this component
 * refuses to render rather than guess a currency.
 */
export function Money({ amount, currency, muted, className }: MoneyProps) {
  if (amount == null || !currency) {
    return (
      <span className="text-muted-foreground" title="No currency recorded for this amount">
        --
      </span>
    );
  }
  return (
    <span className={[muted ? 'text-muted-foreground' : '', className ?? ''].filter(Boolean).join(' ')}>
      {formatCurrencyNumber(amount, currency)}
    </span>
  );
}
