"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function normalizePath(path: string): string {
  return path.split("?")[0].split("#")[0];
}

function pageViewed(path: string): void {
  // eslint-disable-next-line no-console
  console.debug("page.viewed", { path, timestamp: new Date().toISOString() });
}

/** Fires `page.viewed` on mount and on every App Router pathname change. */
export default function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    pageViewed(normalizePath(pathname));
  }, [pathname]);

  return null;
}
