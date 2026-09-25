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
      this.openedAt = this.now();
      this.openCount += 1;
    }
  }

  isOpen(): boolean {
    return this.state === 'open';
  }
}
