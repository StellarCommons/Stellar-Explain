import { createContext, useMemo, type ReactNode } from 'react';
import type { AnalyticsConfig } from '../config.js';
import type { Emitter } from '../emitter/index.js';
import { AnalyticsClient } from '../client.js';

/**
 * Analytics #71 — React context provider exposing a single shared
 * `AnalyticsClient` instance to the component tree.
 */
export const AnalyticsContext = createContext<AnalyticsClient | null>(null);

/**
 * Analytics #76 — a drop-in `AnalyticsClient` that fully no-ops every
 * tracking call. Used by `AnalyticsProvider`'s `disabled` prop so tests
 * and Storybook stories never enqueue or emit real events.
 */
class DisabledAnalyticsClient extends AnalyticsClient {
  track(): void {
    // Intentional no-op — disabled.
  }

  async flush(): Promise<void> {
    // Intentional no-op — disabled.
  }
}

export interface AnalyticsProviderProps {
  config?: AnalyticsConfig;
  emitter?: Emitter;
  /**
   * Analytics #76 — when true, fully disables tracking (no events are
   * queued or emitted). Intended for tests and Storybook.
   */
  disabled?: boolean;
  children: ReactNode;
}

export function AnalyticsProvider({
  config,
  emitter,
  disabled = false,
  children,
}: AnalyticsProviderProps) {
  // Analytics #75 — AnalyticsClient never touches `window`/`document` in its
  // constructor or `track()`/`flush()` paths, so constructing it here is
  // safe during SSR (e.g. Next.js server render), and children always
  // render regardless of environment.
  const client = useMemo(
    () =>
      disabled
        ? new DisabledAnalyticsClient(config, emitter)
        : new AnalyticsClient(config, emitter),
    [config, emitter, disabled],
  );

  return <AnalyticsContext.Provider value={client}>{children}</AnalyticsContext.Provider>;
}
