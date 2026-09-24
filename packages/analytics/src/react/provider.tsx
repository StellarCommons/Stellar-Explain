import { createContext, useMemo, type ReactNode } from 'react';
import type { AnalyticsConfig } from '../config.js';
import type { Emitter } from '../emitter/index.js';
import { AnalyticsClient } from '../client.js';

/**
 * Analytics #71 — React context provider exposing a single shared
 * `AnalyticsClient` instance to the component tree.
 */
export const AnalyticsContext = createContext<AnalyticsClient | null>(null);

export interface AnalyticsProviderProps {
  config?: AnalyticsConfig;
  emitter?: Emitter;
  children: ReactNode;
}

export function AnalyticsProvider({ config, emitter, children }: AnalyticsProviderProps) {
  const client = useMemo(() => new AnalyticsClient(config, emitter), [config, emitter]);

  return <AnalyticsContext.Provider value={client}>{children}</AnalyticsContext.Provider>;
}
