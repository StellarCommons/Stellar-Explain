// Fix: add abort controller to TransactionHistoryTab fetches (#1325)
// Fetches were not cancelled on unmount, causing state updates on unmounted components.

import { useEffect, useRef } from 'react';

export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current = new AbortController();
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return controllerRef;
}
