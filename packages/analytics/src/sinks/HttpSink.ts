import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';

export interface HttpSinkOptions {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  useBeacon?: boolean;
}

/**
 * An `Emitter` that POSTs events to an HTTP(S) endpoint via `fetch`.
 *
 * Throws on non-2xx responses so callers can route failures to a
 * dead-letter / circuit breaker.
 */
export class HttpSink implements Emitter {
  constructor(private readonly options: HttpSinkOptions) {}

  async send(event: AnalyticsEvent): Promise<void> {
    const response = await fetch(this.options.endpoint, this.requestInit(event));
    if (!response.ok) {
      throw new Error(`analytics HTTP ${response.status}`);
    }
  }

  sendBeacon(event: AnalyticsEvent): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
      return navigator.sendBeacon(this.options.endpoint, blob);
    }
    if (typeof fetch === 'function') {
      void fetch(this.options.endpoint, this.requestInit(event));
      return true;
    }
    return false;
  }

  beaconSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
  }

  private requestInit(event: AnalyticsEvent): RequestInit {
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
    };
  }
}