/**
 * #94 — client-side circuit breaker.
 *
 * Guards a downstream dependency (an emitter/sink) against repeated
 * failures:
 *
 *  - **closed**   — traffic flows; failures are counted.
 *  - **open**     — after `failureThreshold` consecutive failures requests
 *    are short-circuited for `openTimeoutMs`, then the breaker moves to
 *    half-open.
 *  - **half-open** — a single trial request is let through; success closes
 *    the circuit, another failure re-opens it.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. Default: 3. */
  failureThreshold?: number;
  /** How long (ms) an open circuit stays open before half-open. Default: 10_000. */
  openTimeoutMs?: number;
  /** Consecutive successes in half-open required to close. Default: 1. */
  successThreshold?: number;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly openTimeoutMs: number;
  private readonly successThreshold: number;

  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private openedAt = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.openTimeoutMs = options.openTimeoutMs ?? 10_000;
    this.successThreshold = options.successThreshold ?? 1;
  }

  /** Current circuit state. */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Ask whether a request may proceed.
   *
   * While open the circuit stays put until the timeout elapses, at which
   * point it moves to half-open and lets one trial request through.
   *
   * @returns `true` when the call may proceed, else `false`.
   */
  allowRequest(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.openTimeoutMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  /** Report a successful call. */
  onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    } else {
      this.successCount = 0;
    }
  }

  /** Report a failed call. */
  onFailure(): void {
    this.successCount = 0;
    if (this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = Date.now();
      this.failureCount = 0;
      return;
    }
    this.failureCount += 1;
    if (this.state === 'closed' && this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      this.failureCount = 0;
    }
  }

  /** Force the circuit back to a clean closed state. */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = 0;
  }
}