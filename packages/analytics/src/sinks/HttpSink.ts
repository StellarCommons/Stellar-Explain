import type { AnalyticsEvent } from '../types.js';
import type { Emitter } from '../emitter/index.js';
import { CircuitBreaker, type CircuitState, type CircuitBreakerOptions } from '../lib/circuitBreaker.js';

/**
 * Raised when no `fetch` implementation is available at all.
 *
 * Distinct from a network error so callers can tell "this environment cannot
 * make requests" from "the request failed", which need different handling: the
 * first is a configuration/environment problem, the second is usually transient.
 */
export class FetchUnavailableError extends Error {
  constructor(message = 'Fetch is unavailable in this environment') {
    super(message);
    this.name = 'FetchUnavailableError';
  }
}

/** Minimal `fetch` shape, so a stub can be injected in tests. */
export type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number }>;

/** Options for the {@link HttpSink}. */
export interface HttpSinkOptions {
  /** Endpoint the events are POSTed to. */
  endpoint?: string;
  /** Alias of {@link HttpSinkOptions.endpoint}. */
  url?: string;
  /** Optional API key sent as `Authorization: Bearer <key>`. */
  apiKey?: string;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /** Circuit breaker tuning (#81/#83). */
  circuitBreaker?: CircuitBreakerOptions;
  /**
   * Retries after the initial attempt. Default `0`.
   *
   * Zero by default so a single `send()` means one HTTP request: a caller that
   * retries here and again in its own transport would multiply the attempt
   * count, and `tests/http-sink.test.ts` asserts one `fetch` call per send.
   */
  maxRetries?: number;
  /** Base delay for exponential backoff, in ms. Default 200. */
  baseDelayMs?: number;
  /**
   * #87 — prefer `navigator.sendBeacon` for `send()`. Useful for
   * fire-and-forget paths (page unload) where beacon is most reliable.
   */
  useBeacon?: boolean;
  /** Maximum events per request in {@link HttpSink.sendBatch}. Default 50. */
  batchSize?: number;
  /** Inject a `fetch` implementation (tests, or non-standard transports). */
  fetchImpl?: FetchLike;
}

/**
 * #17, #50, #81, #82, #83, #87 — an `Emitter` that POSTs events to an
 * HTTP(S) endpoint.
 *
 * Three delivery concerns live here, deliberately in one place rather than
 * spread across the four class bodies this file used to contain:
 *
 *  - **transport** — `fetch`, with `navigator.sendBeacon` preferred for the
 *    page-unload path and a `keepalive` fetch fallback where beacon is absent.
 *  - **circuit breaking** (#81/#82/#83) — after `failureThreshold` consecutive
 *    failures the circuit opens and events are skipped rather than sent, until
 *    the cooldown allows one half-open trial.
 *  - **retries and dead letters** (#1076/#1077/#1078) — retries with
 *    exponential backoff; events that exhaust their budget are recorded in the
 *    dead-letter list instead of being lost silently.
 *
 * `send()` rejects on a non-2xx response so callers can route the failure
 * themselves. `sendBatch()` is the bounded-batch variant used by the ingest
 * pipeline.
 */
export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly headers: Record<string, string>;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly useBeacon: boolean;
  private readonly batchSize: number;
  private readonly fetchImpl?: FetchLike;
  private readonly deadLetters: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    // `endpoint` is the documented name; `url` is accepted as an alias because
    // the batching path in ARCHITECTURE.md and tests/analytics-extended.test.ts
    // use it. Requiring both to be absent is an error rather than a silent
    // fallback, because "no endpoint" otherwise fails much later as a fetch to
    // the string "undefined".
    const endpoint = options.endpoint ?? options.url;
    if (!endpoint) {
      throw new TypeError('HttpSink requires an endpoint (or url)');
    }

    this.endpoint = endpoint;
    this.apiKey = options.apiKey;
    this.headers = options.headers ?? {};
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.maxRetries = options.maxRetries ?? 0;
    this.baseDelayMs = options.baseDelayMs ?? 200;
    this.useBeacon = options.useBeacon ?? false;
    this.batchSize = options.batchSize ?? 50;
    this.fetchImpl = options.fetchImpl;
  }

  /**
   * Send a single event, retrying up to `maxRetries` times with exponential
   * backoff. Throws once the budget is exhausted.
   */
  async send(event: AnalyticsEvent): Promise<void> {
    if (this.useBeacon && this.beaconSupported()) {
      this.sendBeacon(event);
      return;
    }

    await this.post(event);
  }

  /**
   * Send events in bounded batches. Each batch is a separate request with a
   * JSON array body; a batch that exhausts its retries is dead-lettered as a
   * whole rather than partially delivered, so a retry cannot double-send the
   * events that already succeeded.
   */
  async sendBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    for (let offset = 0; offset < events.length; offset += this.batchSize) {
      const batch = events.slice(offset, offset + this.batchSize);
      await this.request(this.endpoint, this.batchBody(batch), batch);
    }
  }

  /**
   * #87 — best-effort beacon send. Uses `navigator.sendBeacon` when
   * available, otherwise a `fetch` with `keepalive`.
   *
   * @returns `true` if the event was handed to the browser, else `false`.
   */
  sendBeacon(event: AnalyticsEvent): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
      return navigator.sendBeacon(this.endpoint, blob);
    }
    if (this.resolveFetch()) {
      void this.resolveFetch()!(this.endpoint, this.requestInit(event, true));
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

  /** Analytics #82 — the underlying circuit breaker's current state. */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /** #1078 — events whose delivery exhausted its retry budget. */
  getDeadLetters(): AnalyticsEvent[] {
    return [...this.deadLetters];
  }

  clearDeadLetters(): void {
    this.deadLetters.length = 0;
  }

  // ── internals ───────────────────────────────────────────────────────────────

  private resolveFetch(): FetchLike | undefined {
    const candidate = this.fetchImpl ?? (typeof fetch === 'function' ? (fetch as unknown as FetchLike) : undefined);
    return candidate;
  }

  private async post(event: AnalyticsEvent): Promise<void> {
    await this.request(this.endpoint, JSON.stringify(event), [event]);
  }

  /** POST `body`, applying the circuit breaker, retries and dead-lettering. */
  private async request(
    url: string,
    body: string,
    deadLetterOnFailure: readonly AnalyticsEvent[],
  ): Promise<void> {
    if (!this.circuitBreaker.canProceed()) {
      // Circuit open — record the event rather than dropping it silently, so an
      // outage is recoverable instead of lossy.
      this.deadLetterAll(deadLetterOnFailure);
      return;
    }

    const doFetch = this.resolveFetch();
    if (!doFetch) {
      this.circuitBreaker.recordFailure();
      throw new FetchUnavailableError();
    }

    let lastStatus = 0;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(this.baseDelayMs * Math.pow(2, attempt - 1));
      }

      try {
        const response = await doFetch(url, this.init(body));
        if (response.ok) {
          this.circuitBreaker.recordSuccess();
          return;
        }
        lastStatus = response.status;
        lastError = new Error(`analytics HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      this.circuitBreaker.recordFailure();
    }

    // Budget exhausted: record for later, then surface the failure.
    this.deadLetterAll(deadLetterOnFailure);
    if (lastStatus > 0) throw new Error(`analytics HTTP ${lastStatus}`);
    throw lastError;
  }

  private deadLetterAll(events: readonly AnalyticsEvent[]): void {
    this.deadLetters.push(...events);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private batchBody(events: readonly AnalyticsEvent[]): string {
    return JSON.stringify(events);
  }

  private init(body: string, keepalive = false): RequestInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.headers,
    };
    if (this.apiKey) {
      headers['authorization'] = `Bearer ${this.apiKey}`;
    }
    return {
      method: 'POST',
      headers,
      body,
      ...(keepalive ? { keepalive: true } : {}),
    };
  }

  private requestInit(event: AnalyticsEvent, keepalive = false): RequestInit {
    return this.init(JSON.stringify(event), keepalive);
  }
}