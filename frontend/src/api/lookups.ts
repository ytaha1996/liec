import { useQuery } from '@tanstack/react-query';
import { getJson } from './client';

export interface LookupItem {
  value: number;
  code: string;
  label: string;
}

export const UNIT_LABEL_EN: Record<string, string> = {
  Box: 'Box',
  Piece: 'Piece',
  Crt: 'Carton',
  Bag: 'Bag',
  Pallet: 'Pallet',
};

export const useUnitsLookup = () =>
  useQuery<LookupItem[]>({
    queryKey: ['/api/lookups/units'],
    queryFn: () => getJson<LookupItem[]>('/api/lookups/units'),
    staleTime: Infinity,
  });
