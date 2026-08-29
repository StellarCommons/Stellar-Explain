/**
 * Analytics #49 — usePageView hook for Next.js App Router route tracking.
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "./useAnalytics";

/**
 * Calls `trackPageView()` on mount and again every time the App Router
 * pathname changes. Must be used within an `AnalyticsProvider`.
 *
 * Typically called once, near the root of the app (e.g. in a layout),
 * rather than in every page.
 */
export function usePageView(): void {
  const client = useAnalytics();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    client.trackPageView(pathname);
  }, [pathname, client]);
}
