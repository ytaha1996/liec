import { format as formatFn, isValid, parseISO } from 'date-fns';
import { isEmpty, isValidNumber } from './validation-utils';

// date-fns format tokens differ from dayjs:
//   dayjs DD-MM-YYYY → date-fns dd-MM-yyyy
//   dayjs DD-MM-YYYY HH:mm:ss → date-fns dd-MM-yyyy HH:mm:ss
const DEFAULT_DATE = 'dd-MM-yyyy';
const DEFAULT_DATETIME = 'dd-MM-yyyy HH:mm:ss';

const toDate = (value: unknown): Date | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  if (typeof value === 'string') {
    // Try ISO first, then native Date fallback for "DD-MM-YYYY"-style strings.
    const iso = parseISO(value);
    if (isValid(iso)) return iso;
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  return null;
};

export function formatCurrencyNumber(
  value: unknown,
  currency = 'USD',
  decimals = 2,
): string {
  if (!isValidNumber(value)) return '--';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(parseFloat(String(value)));
  } catch {
    return `${currency} ${parseFloat(String(value)).toFixed(decimals)}`;
  }
}

export function formatDate(date: unknown, formatStr: string = DEFAULT_DATE): string {
  const d = toDate(date);
  return d ? formatFn(d, formatStr) : '--';
}

export function formatDateTime(datetime: unknown, formatStr: string = DEFAULT_DATETIME): string {
  const d = toDate(datetime);
  return d ? formatFn(d, formatStr) : '--';
}

export function formatIntPhoneNumber(value: string): string {
  return isEmpty(value) ? '--' : value;
}
