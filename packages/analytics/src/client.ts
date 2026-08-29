import { AnalyticsEvent, EventName } from "./types/events";
import { EventQueue, FlushCallback } from "./queue";
import { StellarAnalyticsEvent } from "./types";
import { getConnectionType } from "./network";
import { isOptedOutViaDoNotTrack, isOptedOutViaLocalStorage } from "./optout";
import { shouldSample } from "./sampling";
import { buildHistorySelectEvent } from "./events/history";
import { buildTabSwitchEvent } from "./events/tab-switch";
import { buildBackButtonEvent } from "./events/navigation";
import { buildRetryEvent } from "./events/retry";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AnalyticsClientConfig {
  /**
   * The endpoint that will receive batched events.
   * When omitted (e.g. in test environments) events are flushed to the
   * `onFlush` callback only.
   */
  endpoint?: string;

  /**
   * Custom HTTP headers forwarded on every batch POST request.
   * Merged on top of `{ "Content-Type": "application/json" }`.
   */
  headers?: Record<string, string>;

  /**
   * Override the flush callback entirely — useful for testing or custom sinks.
   * If both `endpoint` and `onFlush` are provided, `onFlush` takes precedence.
   */
  onFlush?: FlushCallback;

  /**
   * Injectable `fetch` implementation — defaults to the global `fetch`.
   * Useful for server-side environments or tests.
   */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;

  /**
   * When `true` the client accepts events regardless of the `DNT` header.
   * Defaults to `false` — Do Not Track is respected.
   */
  ignoreDnt?: boolean;

  /**
   * When `true`, emits `console.debug` diagnostics for internal state
   * changes — e.g. tracking being disabled by a Do Not Track signal.
   * Defaults to `false`.
   */
  debug?: boolean;

  /**
   * Fraction of events to keep, in the range `[0, 1]`. Defaults to `1`
   * (keep every event). Values below `1` randomly drop events per-call to
   * `track()` — useful for controlling ingestion cost on high-traffic
   * pages. Out-of-range values are clamped.
   */
  sampleRate?: number;
}

// ---------------------------------------------------------------------------
// AnalyticsClient
// ---------------------------------------------------------------------------

/**
 * High-level analytics client for Stellar Explain.
 *
 * Usage:
 * ```ts
 * const client = new AnalyticsClient({ endpoint: "https://api.example.com/events" });
 *
 * client.track({
 *   id: crypto.randomUUID(),
 *   name: "page_view",
 *   timestamp: new Date(),
 *   sessionId: "sess-abc",
 *   properties: { path: "/tx/abc123" },
 * });
 *
 * // On teardown:
 * await client.flush();
 * client.destroy();
 * ```
 *
 * Events are batched in an `EventQueue` and flushed automatically every
 * 30 seconds or when 20 events accumulate, whichever comes first.
 */
export class AnalyticsClient {
  private readonly config: AnalyticsClientConfig;
  private readonly queue: EventQueue;
  private readonly optedOut: boolean;

  constructor(config: AnalyticsClientConfig = {}) {
    this.config = config;
    this.queue = new EventQueue(this._buildFlushCallback());
    this.optedOut = this._checkOptOut();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Queue an analytics event for delivery.
   *
   * - Unknown event names are silently dropped with a console warning.
   * - A `StellarAnalyticsEvent` can be passed directly; it is widened to
   *   `AnalyticsEvent` internally.
   */
  track(event: AnalyticsEvent | StellarAnalyticsEvent): void {
    if (this.optedOut) return;

    const base = event as AnalyticsEvent;

    if (!EventName.includes(base.name as EventName)) {
      console.warn(`[analytics] dropped unknown event "${base.name}"`);
      return;
    }

    if (this.config.sampleRate !== undefined && !shouldSample(this.config.sampleRate)) {
      return;
    }

    this.queue.enqueue(this._attachConnectionType(base));
  }

  /**
   * Queue a `history_select` event recording a click on a history entry to
   * reload a result.
   *
   * @param type - The kind of result being reloaded, e.g. "tx" or "account".
   */
  trackHistorySelect(type: string): void {
    this.track(buildHistorySelectEvent(type));
  }

  /**
   * Queue a `tab_switch` event recording a switch between the Transaction
   * and Account tabs.
   *
   * @param from - The tab the user switched from.
   * @param to - The tab the user switched to.
   */
  trackTabSwitch(from: string, to: string): void {
    this.track(buildTabSwitchEvent(from, to));
  }

  /**
   * Queue a `back_button` event recording a click on the back button of a
   * result page.
   *
   * @param from - The page or state the user navigated back from.
   */
  trackBackButton(from: string): void {
    this.track(buildBackButtonEvent(from));
  }

  /**
   * Queue a `retry` event recording a click on the retry button of an error
   * state.
   *
   * @param type - What is being retried.
   * @param errorCode - The error code shown on the error state.
   */
  trackRetry(type: string, errorCode: string): void {
    this.track(buildRetryEvent(type, errorCode));
  }

  /**
   * Immediately flush all queued events without waiting for the next
   * automatic flush.
   */
  async flush(): Promise<void> {
    await this.queue.flush();
  }

  /**
   * Number of events currently waiting to be flushed.
   */
  queueSize(): number {
    return this.queue.size();
  }

  /**
   * Cancel the internal flush timer. Call this during teardown to prevent
   * timer leaks (especially important in tests and SSR environments).
   */
  destroy(): void {
    this.queue.destroy();
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Attaches the current connection type (e.g. "4g", "wifi") to
   * `event.properties.connectionType` when the Network Information API is
   * available. Events are returned unchanged when it isn't (Node/SSR, or
   * an unsupporting browser), so no `connectionType: undefined` key is ever
   * added to the payload.
   */
  private _attachConnectionType(event: AnalyticsEvent): AnalyticsEvent {
    const connectionType = getConnectionType();
    if (connectionType === undefined) return event;

    return {
      ...event,
      properties: {
        ...event.properties,
        connectionType,
      },
    };
  }

  /**
   * Resolves the client's opt-out state once, at construction time.
   *
   * - A `stellar-explain-analytics-optout` localStorage flag disables
   *   tracking silently.
   * - A `navigator.doNotTrack === "1"` signal disables tracking and, when
   *   `config.debug` is set, logs a message explaining why.
   * - `config.ignoreDnt` skips the Do Not Track check (the localStorage
   *   flag is still honored).
   */
  private _checkOptOut(): boolean {
    if (isOptedOutViaLocalStorage()) return true;

    if (!this.config.ignoreDnt && isOptedOutViaDoNotTrack()) {
      if (this.config.debug) {
        console.debug("[analytics] tracking disabled — Do Not Track is enabled");
      }
      return true;
    }

    return false;
  }

  private _buildFlushCallback(): FlushCallback {
    // Explicit override takes priority
    if (this.config.onFlush) {
      return this.config.onFlush;
    }

    // HTTP sink
    if (this.config.endpoint) {
      const url = this.config.endpoint;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.config.headers,
      };
      const fetchImpl = this.config.fetchImpl ?? fetch;

      return async (batch) => {
        const response = await fetchImpl(url, {
          method: "POST",
          headers,
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          throw new Error(
            `[analytics] batch POST failed: ${response.status} ${response.statusText}`,
          );
        }
      };
    }

    // No-op fallback — useful during development / when no endpoint is set
    return (batch) => {
      if (batch.length > 0) {
        console.debug(`[analytics] no-op flush — ${batch.length} event(s) discarded`);
      }
    };
  }
}
