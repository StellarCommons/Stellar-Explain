"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface AnalyticsContextValue {
  track: (name: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

function defaultTrack(name: string, properties?: Record<string, unknown>): void {
  // Issue #96: never track during SSR — there is no browser here to
  // eventually receive the analytics call, so route it to a no-op instead
  // of logging a message that will never correspond to a real client event.
  if (typeof window === "undefined") return;

  // eslint-disable-next-line no-console
  console.debug("[analytics]", {
    name,
    properties,
    timestamp: new Date().toISOString(),
  });
}

/** Initialises the analytics singleton and exposes it to child components. */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AnalyticsContextValue>(() => ({ track: defaultTrack }), []);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return ctx;
}
