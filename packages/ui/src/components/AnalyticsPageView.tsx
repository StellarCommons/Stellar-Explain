"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

function normalizePath(path: string): string {
  return path.split("?")[0].split("#")[0];
}

function pageViewed(path: string, properties?: Record<string, string>): void {
  // eslint-disable-next-line no-console
  console.debug("page.viewed", { path, ...properties, timestamp: new Date().toISOString() });
}

/** Fires `page.viewed` on mount and on every App Router pathname change. */
export default function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = searchParams.get(key);
      if (value) utm[key] = value;
    }
    pageViewed(normalizePath(pathname), Object.keys(utm).length > 0 ? utm : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
