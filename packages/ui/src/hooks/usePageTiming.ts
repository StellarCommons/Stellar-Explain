"use client";

import { useEffect, useState } from "react";

export interface PageTiming {
  ttfb: number | null;
  fcp: number | null;
  domInteractive: number | null;
}

const EMPTY_TIMING: PageTiming = { ttfb: null, fcp: null, domInteractive: null };

function readPageTiming(): PageTiming {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return EMPTY_TIMING;
  }

  const [nav] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  const fcpEntry = performance
    .getEntriesByType("paint")
    .find((entry) => entry.name === "first-contentful-paint");

  return {
    ttfb: nav ? nav.responseStart - nav.requestStart : null,
    fcp: fcpEntry ? fcpEntry.startTime : null,
    domInteractive: nav ? nav.domInteractive : null,
  };
}

/**
 * Measures time-to-interactive style metrics for the current page so they
 * can be attached to a `page.viewed` event's properties.
 */
export function usePageTiming(onReady?: (timing: PageTiming) => void): PageTiming {
  const [timing, setTiming] = useState<PageTiming>(EMPTY_TIMING);

  useEffect(() => {
    const result = readPageTiming();
    setTiming(result);
    onReady?.(result);
    // Intentionally runs once per mount — timing is captured for the initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return timing;
}
