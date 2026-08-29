/**
 * Analytics #48 — React integration.
 *
 * `useAnalytics()` reads the `AnalyticsClient` provided by the nearest
 * `AnalyticsProvider` ancestor.
 */

import { useContext } from "react";
import { AnalyticsClient } from "../client";
import { AnalyticsContext } from "./provider";

/**
 * Returns the `AnalyticsClient` instance from the nearest `AnalyticsProvider`.
 *
 * @throws if called outside an `AnalyticsProvider` — this surfaces a missing
 * provider immediately, rather than silently no-op-ing every `track()` call.
 */
export function useAnalytics(): AnalyticsClient {
  const client = useContext(AnalyticsContext);
  if (!client) {
    throw new Error("useAnalytics() must be used within an <AnalyticsProvider>.");
  }
  return client;
}
