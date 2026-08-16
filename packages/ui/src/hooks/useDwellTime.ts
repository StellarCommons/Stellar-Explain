"use client";

import { useEffect, useRef } from "react";

/**
 * Measures dwell time from mount to unmount (e.g. render to navigation away)
 * and reports it via `onLeave` so it can be attached to a `page.dwell` event.
 */
export function useDwellTime(onLeave: (dwellMs: number) => void): void {
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    return () => {
      onLeave(Date.now() - startedAt.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
