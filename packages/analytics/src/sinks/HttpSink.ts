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
  }
}
