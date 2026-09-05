import { useEffect, useState } from 'react';

// Returns a value that lags `value` by `ms` milliseconds. Use to gate
// network calls behind a search input so typing doesn't fire a request per keystroke.
export const useDebouncedValue = <T,>(value: T, ms = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};
