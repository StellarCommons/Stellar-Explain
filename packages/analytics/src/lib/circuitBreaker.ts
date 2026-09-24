/**
 * Analytics #81 — a simple consecutive-failure circuit breaker.
 *
 * - `closed`: requests proceed normally.
 * - `open`: requests are rejected outright until the cooldown elapses,
 *   after `failureThreshold` consecutive failures.
 * - `half-open` (#83): after the cooldown, exactly one trial request is
 *   allowed through; success closes the circuit, failure re-opens it for
 *   another cooldown period.
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. Default: 5. */
  failureThreshold?: number;
  /** Milliseconds to wait before allowing a half-open trial. Default: 30000. */
  cooldownMs?: number;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
  }

  /**
   * Whether a request should be allowed to proceed right now.
   *
   * Transitions `open` → `half-open` once the cooldown has elapsed, and
   * allows exactly one trial request through in the `half-open` state
   * (#83) — subsequent calls while that trial is outstanding are refused
   * until it resolves via `recordSuccess()`/`recordFailure()`.
   */
  canProceed(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open: only the request that triggered the transition proceeds;
    // canProceed() itself doesn't consume the trial, recordSuccess/Failure does.
    return false;
  }

  recordSuccess(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openedAt = 0;
  }

  recordFailure(): void {
    if (this.state === 'half-open') {
      // The trial probe failed — re-open for another cooldown period.
      this.state = 'open';
      this.openedAt = Date.now();
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
