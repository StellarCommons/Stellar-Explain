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
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
}

/** Small three-state circuit breaker used by delivery transports. */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private trialInFlight = false;
  private openCount = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = Math.max(1, Math.floor(options.failureThreshold ?? 5));
    this.cooldownMs = Math.max(0, options.cooldownMs ?? 60_000);
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    return this.state;
  }

  getOpenCount(): number {
    return this.openCount;
  }

  /** Returns true when one delivery attempt may proceed. */
  canPass(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (this.now() - this.openedAt < this.cooldownMs) return false;
      this.state = 'half-open';
      this.trialInFlight = true;
      return true;
    }

    if (this.trialInFlight) return false;
    this.trialInFlight = true;
    return true;
  }

  /** Alias useful to transport implementations. */
  allowRequest(): boolean {
    return this.canPass();
  }

  /** Alias retained for the original circuit-breaker proposal. */
  canProceed(): boolean {
    return this.canPass();
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
    this.trialInFlight = false;
  }

  recordFailure(): void {
    this.trialInFlight = false;

    if (this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = this.now();
      this.openCount += 1;
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
      this.openedAt = this.now();
      this.openCount += 1;
    }
  }

  isOpen(): boolean {
    return this.state === 'open';
  }
}
