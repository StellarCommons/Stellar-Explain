/**
 * Analytics #50 — useTrackEvent hook.
 */

"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "./useAnalytics";
import { AnalyticsEvent } from "../types/events";
import { StellarAnalyticsEvent } from "../types";

export type TrackEventFn = (event: AnalyticsEvent | StellarAnalyticsEvent) => void;

/**
 * Returns a memoized `track` function that tags every event with the
 * current page's pathname (as `properties.path`), so call sites don't need
 * to thread it through by hand. An event's own `path` property, if it
 * already set one, is left untouched.
 *
 * The returned function's identity only changes when the client instance or
 * the pathname changes, so it's safe to use as a `useEffect`/`useCallback`
 * dependency. Must be used within an `AnalyticsProvider`.
 */
export function useTrackEvent(): TrackEventFn {
  const client = useAnalytics();
  const pathname = usePathname();

  return useCallback(
    (event: AnalyticsEvent | StellarAnalyticsEvent) => {
      const properties = (event as AnalyticsEvent).properties;
      client.track({
        ...event,
        properties:
          pathname && properties?.path === undefined
            ? { ...properties, path: pathname }
            : properties,
      } as AnalyticsEvent);
    },
    [client, pathname],
  );
}
