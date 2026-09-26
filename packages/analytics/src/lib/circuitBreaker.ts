/**
 * Analytics #81 — a consecutive-failure circuit breaker.
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
  /** Alias for cooldownMs. */
  openTimeoutMs?: number;
  /** Optional clock provider for testing. Default: Date.now. */
  now?: () => number;
}

/** Small three-state circuit breaker used by delivery transports and clients. */
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
    this.cooldownMs = Math.max(0, options.openTimeoutMs ?? options.cooldownMs ?? 30_000);
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  getOpenCount(): number {
    return this.openCount;
  }

  /**
   * Returns true when one delivery attempt may proceed.
   * Transitions `open` -> `half-open` once cooldown has elapsed.
   */
  canPass(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (this.now() - this.openedAt < this.cooldownMs) return false;
      this.state = 'half-open';
      this.trialInFlight = true;
      return true;
    }

    // half-open: only allow one trial in-flight
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
    this.trialInFlight = false;
  }

  /** Alias for recordSuccess */
  onSuccess(): void {
    this.recordSuccess();
  }

  recordFailure(): void {
    this.trialInFlight = false;

    if (this.state === 'half-open') {
      // The trial probe failed — re-open for another cooldown period.
      this.state = 'open';
      this.openedAt = this.now();
      this.openCount += 1;
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = this.now();
      this.openCount += 1;
    }
  }

  /** Alias for recordFailure */
  onFailure(): void {
    this.recordFailure();
  }

  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openedAt = 0;
    this.trialInFlight = false;
  }
}
