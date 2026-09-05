import { useEffect, useRef, useState } from 'react';

export interface InitializeState {
  initializing: boolean;
  initialized: boolean;
  // Any error that occurred during one of the loaders. The first failure wins;
  // subsequent failures are silenced because each loader has its own `error`
  // state via `useLoader`.
  error: Error | null;
}

/**
 * Run a list of independent loaders in parallel for first paint.
 *
 *   useInitializeFunction([shipments.reload, warehouses.reload, customers.reload]);
 *
 * Uses `Promise.allSettled` so one failing loader doesn't block the others.
 * Each loader still owns its own `error` state via `useLoader`, so pages can
 * render granular fallbacks.
 *
 * Pass `deps` to re-initialize when a controlling value changes (e.g. debounced
 * search term). Omit `deps` for a once-on-mount initializer.
 */
export function useInitializeFunction(
  loaders: Array<() => Promise<unknown>>,
  deps: ReadonlyArray<unknown> = [],
): InitializeState {
  const [initializing, setInitializing] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep loaders stable in a ref so we don't re-run when callers pass a fresh
  // array on each render (common when wrapped with useCallback inline).
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    setInitializing(true);
    setError(null);

    Promise.allSettled(loadersRef.current.map((fn) => fn())).then((results) => {
      if (cancelled) return;
      const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (firstFailure) {
        const reason = firstFailure.reason;
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      }
      setInitializing(false);
      setInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, deps);

  return { initializing, initialized, error };
}
