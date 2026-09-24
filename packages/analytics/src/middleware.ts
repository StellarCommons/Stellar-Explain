import type { AnalyticsEvent } from './types.js';
import type { Plugin } from './plugins.js';

export type BeforeSendHook = (
  event: AnalyticsEvent,
) => AnalyticsEvent | Promise<AnalyticsEvent> | undefined;

/**
 * #99 — composes `beforeSend` hooks (from plugins and manual registrations)
 * into an ordered pipeline applied to every event before it is sent.
 */
export class Middleware {
  private readonly hooks: BeforeSendHook[] = [];

  /** Append a hook to the pipeline. Returns `this` for chaining. */
  use(hook: BeforeSendHook): this {
    this.hooks.push(hook);
    return this;
  }

  /** Append hooks contributed by a plugin. */
  fromPlugin(plugin: Plugin): this {
    if (typeof plugin.beforeSend === 'function') {
      this.hooks.push(plugin.beforeSend as BeforeSendHook);
    }
    return this;
  }

  /** Append the beforeSend hooks of every plugin, in order. */
  fromPlugins(plugins: Plugin[]): this {
    for (const plugin of plugins) {
      this.fromPlugin(plugin);
    }
    return this;
  }

  /**
   * Run every hook in order. Each hook may return an event (used as the
   * input to the next hook) or `undefined` (input passes through unchanged).
   * Async hooks are awaited; the final event is returned.
   */
  async process(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    let current: AnalyticsEvent = event;
    for (const hook of this.hooks) {
      const result = await hook(current);
      if (result !== undefined) {
        current = result;
      }
    }
    return current;
  }

  get size(): number {
    return this.hooks.length;
  }
}