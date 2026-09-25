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

/**
 * Analytics #77 — a drop-in `AnalyticsClient` that merges a fixed set of
 * `globalProperties` into every tracked event's properties, with
 * event-specific properties taking precedence on key collisions.
 */
class GlobalPropertiesAnalyticsClient extends AnalyticsClient {
  constructor(
    private readonly globalProperties: Record<string, unknown>,
    config?: AnalyticsConfig,
    emitter?: Emitter,
  ) {
    super(config, emitter);
  }

  track(name: string, properties: Record<string, unknown> = {}): void {
    super.track(name, { ...this.globalProperties, ...properties });
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
  /**
   * Analytics #77 — properties merged into every tracked event's context
   * (e.g. app version, environment). Event-specific properties win on
   * key collisions.
   */
  globalProperties?: Record<string, unknown>;
  children: ReactNode;
}

export function AnalyticsProvider({
  config,
  emitter,
  disabled = false,
  globalProperties,
  children,
}: AnalyticsProviderProps) {
  // Analytics #75 — AnalyticsClient never touches `window`/`document` in its
  // constructor or `track()`/`flush()` paths, so constructing it here is
  // safe during SSR (e.g. Next.js server render), and children always
  // render regardless of environment.
  const client = useMemo(() => {
    if (disabled) return new DisabledAnalyticsClient(config, emitter);
    if (globalProperties) return new GlobalPropertiesAnalyticsClient(globalProperties, config, emitter);
    return new AnalyticsClient(config, emitter);
  }, [config, emitter, disabled, globalProperties]);
  const client = useMemo(
    () =>
      disabled
        ? new DisabledAnalyticsClient(config, emitter)
        : new AnalyticsClient(config, emitter),
    [config, emitter, disabled],
  );
export interface AnalyticsProviderProps {
  config?: AnalyticsConfig;
  emitter?: Emitter;
  children: ReactNode;
}

export function AnalyticsProvider({ config, emitter, children }: AnalyticsProviderProps) {
  const client = useMemo(() => new AnalyticsClient(config, emitter), [config, emitter]);

  return <AnalyticsContext.Provider value={client}>{children}</AnalyticsContext.Provider>;
}
