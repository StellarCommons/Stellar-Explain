import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';

/**
 * Options for the {@link HttpSink}.
 */
export interface HttpSinkOptions {
  /** Endpoint the events are POSTed to. */
  endpoint: string;
  /** Optional API key sent as `Authorization: Bearer <key>`. */
  apiKey?: string;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /**
   * #87 — prefer `navigator.sendBeacon` for `send()`. Useful for
   * fire-and-forget paths (page unload) where beacon is most reliable.
   */
  useBeacon?: boolean;
}

/**
 * #17, #50, #87 — an `Emitter` that POSTs events to an HTTP(S) endpoint.
 *
 * `send()` uses `fetch`. `sendBeacon()` (new in #87) uses
 * `navigator.sendBeacon` on page unload, falling back to a synchronous
 * `fetch(..., { keepalive: true })` where beacon is unavailable, so the
 * event is not lost when the document is torn down.
 */
export class HttpSink implements Emitter {
  constructor(private readonly options: HttpSinkOptions) {}

  /**
   * Send a single event. Awaits the HTTP round-trip and throws on
   * non-2xx responses so callers can route failures to a dead-letter.
   */
  async send(event: AnalyticsEvent): Promise<void> {
    if (this.options.useBeacon && this.beaconSupported()) {
      this.sendBeacon(event);
      return;
    }
    const response = await fetch(this.options.endpoint, this.requestInit(event));
    if (!response.ok) {
      throw new Error(`analytics HTTP ${response.status}`);
    }
  }

  /**
   * #87 — best-effort beacon send. Uses `navigator.sendBeacon` when
   * available, otherwise a synchronous `fetch` with `keepalive`.
   *
   * @returns `true` if the event was handed to the browser, else `false`.
   */
  sendBeacon(event: AnalyticsEvent): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
      return navigator.sendBeacon(this.options.endpoint, blob);
    }
    if (typeof fetch === 'function') {
      void fetch(this.options.endpoint, this.requestInit(event, true));
      return true;
    }
    return false;
  }

  /**
   * Whether `navigator.sendBeacon` is available in this environment.
   */
  beaconSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
  }

  private requestInit(event: AnalyticsEvent, keepalive = false): RequestInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.options.headers,
    };
    if (this.options.apiKey) {
      headers['authorization'] = `Bearer ${this.options.apiKey}`;
    }
    return {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      ...(keepalive ? { keepalive: true } : {}),
    };
  }
}