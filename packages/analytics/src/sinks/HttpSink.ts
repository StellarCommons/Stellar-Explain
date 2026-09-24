import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';
import {
  CircuitBreaker,
  type CircuitBreakerOptions,
  type CircuitState,
} from '../lib/circuitBreaker.js';
import { Logger } from '../lib/logger.js';

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status'>>;

export interface HttpSinkOptions {
  /** Endpoint URL. `endpoint` is accepted as a configuration-friendly alias. */
  url?: string;
  endpoint?: string;
  /** Headers merged into every request. */
  headers?: Record<string, string>;
  /** Optional bearer token. */
  token?: string;
  /** Alias used by the client configuration. */
  apiKey?: string;
  /** Maximum number of events in one request. */
  batchSize?: number;
  /** Enable gzip compression when the runtime supports it. */
  compression?: boolean;
  /** Alias for `compression`. */
  compress?: boolean;
  /** Injectable fetch implementation, primarily for tests and SSR. */
  fetchImpl?: FetchLike;
  /** Retry behavior. HttpSink defaults to one attempt. */
  maxAttempts?: number;
  /** Alias for `maxAttempts - 1`, retained for older integrations. */
  maxRetries?: number;
  retryDelayMs?: number;
  /** Alias for `retryDelayMs`. */
  baseDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  circuitBreaker?: CircuitBreaker | CircuitBreakerOptions;
  /** Convenience aliases when no CircuitBreaker instance is supplied. */
  failureThreshold?: number;
  cooldownMs?: number;
  logger?: Logger;
}

export class FetchUnavailableError extends Error {
  constructor() {
    super('Fetch is unavailable in this environment');
    this.name = 'FetchUnavailableError';
  }
}

interface EncodedBody {
  body: BodyInit;
  headers: Record<string, string>;
}

function getGlobalFetch(): FetchLike | undefined {
  const candidate = (globalThis as unknown as { fetch?: FetchLike }).fetch;
  return typeof candidate === 'function' ? candidate.bind(globalThis) : undefined;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * HTTP transport for analytics events.
 *
 * ## Ingest contract
 *
 * `POST` requests target the configured endpoint (the Rust backend route is
 * `/analytics/events`) with `Content-Type: application/json`. The request body
 * is a JSON array of event objects:
 *
 * ```json
 * [
 *   {
 *     "name": "page_view",
 *     "timestamp": 1700000000000,
 *     "properties": { "path": "/" },
 *     "context": { "environment": "production", "buildVersion": "1.2.3" }
 *   }
 * ]
 * ```
 *
 * The backend ingest route accepts a single event object or an array, rejects
 * arrays larger than its configured limit, and returns a JSON acknowledgement
 * such as `{ "status": "accepted" }` with a 2xx status. Any non-2xx response
 * is treated as a failed delivery and is surfaced to the client.
 */
export class HttpSink implements Emitter {
  private readonly url: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly token?: string;
  private readonly batchSize: number;
  private readonly compression: boolean;
  private readonly fetchImpl?: FetchLike;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly circuit: CircuitBreaker;
  private readonly logger: Logger;
  private readonly deadLetters: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    const url = options.url ?? options.endpoint ?? '';
    if (!url) throw new TypeError('HttpSink requires a url or endpoint');

    this.url = url;
    this.extraHeaders = { ...(options.headers ?? {}) };
    this.token = options.token ?? options.apiKey;
    const requestedBatchSize = options.batchSize ?? 20;
    if (
      typeof requestedBatchSize !== 'number' ||
      !Number.isInteger(requestedBatchSize) ||
      requestedBatchSize <= 0
    ) {
      throw new RangeError('HttpSink batchSize must be a positive integer');
    }
    this.batchSize = Math.min(100, requestedBatchSize);
    this.compression = options.compression ?? options.compress ?? false;
    this.fetchImpl = options.fetchImpl ?? getGlobalFetch();
    const attempts =
      options.maxAttempts ?? (options.maxRetries === undefined ? 1 : options.maxRetries + 1);
    this.maxAttempts = Math.max(1, Math.floor(attempts));
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? options.baseDelayMs ?? 100);
    this.sleep = options.sleep ?? sleep;
    this.circuit =
      options.circuitBreaker instanceof CircuitBreaker
        ? options.circuitBreaker
        : new CircuitBreaker(
            options.circuitBreaker ?? {
              failureThreshold: options.failureThreshold,
              cooldownMs: options.cooldownMs,
            },
          );
    this.logger = options.logger ?? new Logger(false);
  }

  /** Send one event using the same array request contract as a batch. */
  send(event: AnalyticsEvent): Promise<void>;
  /** Send an already assembled batch through the same transport path. */
  send(events: readonly AnalyticsEvent[]): Promise<void>;
  async send(eventOrEvents: AnalyticsEvent | readonly AnalyticsEvent[]): Promise<void> {
    if (Array.isArray(eventOrEvents)) {
      await this.sendBatch(eventOrEvents as readonly AnalyticsEvent[]);
      return;
    }
    await this.sendBatch([eventOrEvents as AnalyticsEvent]);
  }

  /** Send events in requests of at most `batchSize` entries. */
  async sendBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    for (let offset = 0; offset < events.length; offset += this.batchSize) {
      await this.postBatch(events.slice(offset, offset + this.batchSize));
    }
  }

  getCircuitState(): CircuitState {
    return this.circuit.getState();
  }

  getCircuitOpenCount(): number {
    return this.circuit.getOpenCount();
  }

  getDeadLetters(): AnalyticsEvent[] {
    return [...this.deadLetters];
  }

  clearDeadLetters(): void {
    this.deadLetters.length = 0;
  }

  private rememberFailure(events: readonly AnalyticsEvent[]): void {
    this.deadLetters.push(...events);
    const overflow = this.deadLetters.length - 100;
    if (overflow > 0) this.deadLetters.splice(0, overflow);
  }

  private async postBatch(events: readonly AnalyticsEvent[]): Promise<void> {
    if (!this.circuit.canPass()) {
      throw new Error('HttpSink circuit is open');
    }

    const fetchImpl = this.fetchImpl;
    if (!fetchImpl) {
      this.circuit.recordFailure();
      this.rememberFailure(events);
      throw new FetchUnavailableError();
    }

    const encoded = await this.encodeBody(events);
    const headers = {
      'Content-Type': 'application/json',
      ...this.extraHeaders,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...encoded.headers,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        const response = await fetchImpl(this.url, {
          method: 'POST',
          headers,
          body: encoded.body,
        });
        const status = response.status ?? 0;
        const ok = response.ok ?? (status >= 200 && status < 300);
        if (!ok) throw new Error(`HttpSink: received HTTP ${status} from ${this.url}`);

        this.circuit.recordSuccess();
        this.logger.log('debug', 'http.send', {
          count: events.length,
          status,
          compressed: Boolean(encoded.headers['Content-Encoding']),
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt + 1 < this.maxAttempts) {
          await this.sleep(this.retryDelayMs * 2 ** attempt);
        }
      }
    }

    this.circuit.recordFailure();
    this.rememberFailure(events);
    throw lastError instanceof Error ? lastError : new Error('HttpSink request failed');
  }

  private async encodeBody(events: readonly AnalyticsEvent[]): Promise<EncodedBody> {
    const json = JSON.stringify(events);
    if (!this.compression) return { body: json, headers: {} };

    try {
      const CompressionStreamCtor = (
        globalThis as unknown as {
          CompressionStream?: new (format: string) => {
            readable: ReadableStream<Uint8Array>;
            writable: WritableStream<Uint8Array>;
          };
        }
      ).CompressionStream;
      const BlobCtor = (globalThis as unknown as { Blob?: typeof Blob }).Blob;
      const ResponseCtor = (globalThis as unknown as { Response?: typeof Response }).Response;

      if (!CompressionStreamCtor || !BlobCtor || !ResponseCtor) {
        return { body: json, headers: {} };
      }

      const compressedStream = new BlobCtor([json])
        .stream()
        .pipeThrough(new CompressionStreamCtor('gzip'));
      const compressed = await new ResponseCtor(compressedStream).arrayBuffer();
      return {
        body: new Uint8Array(compressed),
        headers: { 'Content-Encoding': 'gzip' },
      };
    } catch {
      // Compression is an optimization; malformed/unsupported implementations
      // must never make analytics delivery fail.
      return { body: json, headers: {} };
    }
  }
}
