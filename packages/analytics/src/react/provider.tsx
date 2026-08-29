/**
 * Analytics #48 — React integration.
 *
 * `AnalyticsProvider` makes an existing `AnalyticsClient` instance available
 * to `useAnalytics()` anywhere in the component tree below it.
 */

import { createContext, ReactNode } from "react";
import { AnalyticsClient } from "../client";

export const AnalyticsContext = createContext<AnalyticsClient | undefined>(undefined);

export interface AnalyticsProviderProps {
  /**
   * The `AnalyticsClient` instance to provide. Construct this once (e.g. at
   * the app root, or in a `useState`/module-level singleton) — the provider
   * does not create, own, or destroy the client itself.
   */
  client: AnalyticsClient;
  children: ReactNode;
}

export function AnalyticsProvider({ client, children }: AnalyticsProviderProps) {
  return <AnalyticsContext.Provider value={client}>{children}</AnalyticsContext.Provider>;
}
