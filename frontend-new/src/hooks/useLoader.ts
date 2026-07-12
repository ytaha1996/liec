import { useCallback, useRef, useState } from 'react';

export interface LoaderState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  // Re-run the fetcher and update state. Returned promise resolves with the new
  // data (or rejects if the fetch failed) so callers can chain follow-up work
  // — e.g. closing a dialog only after the refresh succeeds.
  reload: () => Promise<T>;
  // Direct setter for optimistic updates (e.g. after PATCH /resource/{id} we
  // can splice the response into the array without refetching).
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Page-local data loader. Each loader owns its own loading/error state so a
 * page can refresh one resource without touching the others.
 *
 *   const shipments = useLoader(() => getJson<Shipment[]>('/api/shipments'));
 *
 * `useInitializeFunction([shipments.reload, ...])` covers the first paint.
 * After a mutation, call `shipments.reload()` to refresh just that resource.
 */
export function useLoader<T>(fetcher: () => Promise<T>): LoaderState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Pin the latest fetcher in a ref so `reload` keeps a stable identity even
  // as the page recomputes its closure (e.g. when search-term inputs change).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetcherRef.current();
      setData(next);
      return next;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setDataApi = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setData((prev) =>
      typeof updater === 'function' ? (updater as (p: T | undefined) => T)(prev) : updater,
    );
  }, []);

  return { data, loading, error, reload, setData: setDataApi };
}
