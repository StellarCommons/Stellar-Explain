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
import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';
import { CircuitBreaker, type CircuitState, type CircuitBreakerOptions } from '../lib/circuitBreaker.js';

export interface HttpSinkOptions {
  /** The endpoint events are POSTed to. */
  endpoint: string;
  /** Optional API key sent as a Bearer token. */
  apiKey?: string;
  /** Circuit breaker tuning (#81/#83). */
  circuitBreaker?: CircuitBreakerOptions;
}

/**
 * #17 — HTTP transport that POSTs events to a configured endpoint.
 *
 * Analytics #81/#82/#83 — requests are gated by a `CircuitBreaker`: after
 * enough consecutive failures the circuit opens and events are dropped
 * (not sent) until the cooldown elapses and a single half-open trial
 * either closes the circuit again or re-opens it.
 */
export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly circuitBreaker: CircuitBreaker;

export interface HttpSinkOptions {
  endpoint: string;
  maxRetries?: number;
}

/** Emitter that POSTs events to an HTTP endpoint with basic retry logic. */
export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly maxRetries: number;
  private readonly deadLetter: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    this.endpoint = options.endpoint;
    this.maxRetries = options.maxRetries ?? 3;
  }

  send(event: AnalyticsEvent): void {
    this.sendWithRetry(event, 0);
  }

  get deadLetterQueue(): readonly AnalyticsEvent[] {
    return this.deadLetter;
  }

  private sendWithRetry(event: AnalyticsEvent, attempt: number): void {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      if (attempt < this.maxRetries) {
        setTimeout(() => this.sendWithRetry(event, attempt + 1), 200 * (attempt + 1));
      } else {
        this.deadLetter.push(event);
      }
    });
  apiKey?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxRetries?: number;  // default 3
  baseDelayMs?: number; // default 200ms
}

export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly deadLetters: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
  }

  async send(event: AnalyticsEvent): Promise<void> {
    if (!this.circuitBreaker.canProceed()) {
      // Circuit open — drop the request rather than attempting it.
      return;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        this.circuitBreaker.recordFailure();
        return;
      }

      this.circuitBreaker.recordSuccess();
    } catch {
      this.circuitBreaker.recordFailure();
    }
  }

  /** Analytics #82 — exposes the underlying circuit breaker's current state. */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 200;
  }

  async send(event: AnalyticsEvent): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        });
        if (res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify([event]),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return;
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) {
          this.deadLetters.push(event);
          return;
        }
        // exponential backoff: baseDelay * 2^(attempt-1)
        await new Promise(r => setTimeout(r, this.baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }

    this.deadLetters.push(event);
    throw lastError;
  }

  getDeadLetters(): AnalyticsEvent[] {
    return [...this.deadLetters];
  }

  clearDeadLetters(): void {
    this.deadLetters.length = 0;
    this.deadLetters.splice(0, this.deadLetters.length);
  }
}
