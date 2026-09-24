import type { AnalyticsEvent } from './types.js';

/**
 * #98 — a plugin that can observe and/or transform analytics events
 * before they are handed to the emitter(s).
 */
export interface Plugin {
  /** Optional human-readable plugin name (used in middleware chains). */
  name?: string;
  /**
   * Called for every event on flush, in registration order.
   * Return a (possibly modified) event, or the original/previous event to
   * leave it unchanged.
   */
  beforeSend?(event: AnalyticsEvent): AnalyticsEvent | Promise<AnalyticsEvent>;
}

/**
 * #98 — registry of plugins attached to a client.
 */
export class PluginRegistry {
  private readonly plugins: Plugin[] = [];

  /** Register a plugin. Later plugins run after earlier ones. */
  register(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  /** Returns a snapshot of registered plugins, in order. */
  getPlugins(): Plugin[] {
    return [...this.plugins];
  }

  /** Removes all registered plugins. */
  clear(): void {
    this.plugins.length = 0;
  }

  get size(): number {
    return this.plugins.length;
  }
}