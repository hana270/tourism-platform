'use client';

import { useEffect, useState } from 'react';

/** Retourne `value`, mis à jour seulement `delay` ms après la dernière frappe. */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
