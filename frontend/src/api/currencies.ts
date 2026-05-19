import { useQuery } from '@tanstack/react-query';
import { getJson } from './client';
import type { LookupItem } from './lookups';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  isBase: boolean;
  anchorCurrencyCode: string | null;
  rate: number | null;
  isActive: boolean;
  updatedAt: string;
}

export const useCurrenciesLookup = () =>
  useQuery<LookupItem[]>({
    queryKey: ['/api/lookups/currencies'],
    queryFn: () => getJson<LookupItem[]>('/api/lookups/currencies'),
    staleTime: Infinity,
  });

export const useCurrenciesQuery = () =>
  useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
    queryFn: () => getJson<Currency[]>('/api/currencies'),
    // Currencies are effectively static across a session. Mutations explicitly invalidate
    // this key, so a 5-minute staleTime is safe and cheap.
    staleTime: 5 * 60 * 1000,
  });
