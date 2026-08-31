export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. Defaults to 5. */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a trial call. Defaults to 60_000ms. */
  cooldownMs?: number;
  /** Injectable clock, primarily for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Standard three-state circuit breaker (issue #97): `closed` lets every
 * call through and counts consecutive failures; five in a row trips it to
 * `open`, which fails every call fast for `cooldownMs`; the first call
 * after cooldown becomes a single `half-open` trial — success closes the
 * circuit, failure reopens it for another full cooldown.
 *
 * Pure decision logic only (no knowledge of "sinks" or events) so it can be
 * unit-tested without an event pipeline, and reused anywhere in this
 * package that talks to an unreliable external dependency.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;
  private trialInFlight = false;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Whether a call is allowed through right now. Transitions `open` ->
   * `half-open` once the cooldown has elapsed, and only ever allows exactly
   * one trial call through while `half-open` — further calls are refused
   * until that trial resolves via `recordSuccess`/`recordFailure`.
   */
  canPass(): boolean {
    if (this.state === "closed") {
      return true;
    }
    if (this.state === "open") {
      if (this.now() - this.openedAt < this.cooldownMs) {
        return false;
      }
      this.state = "half-open";
      this.trialInFlight = true;
      return true;
    }
    // half-open: only the one in-flight trial call is allowed.
    if (this.trialInFlight) {
      return false;
    }
    this.trialInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.trialInFlight = false;
  }

  recordFailure(): void {
    this.trialInFlight = false;
    if (this.state === "half-open") {
      // The trial itself failed — reopen immediately for another full cooldown.
      this.state = "open";
      this.openedAt = this.now();
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = this.now();
    }
  }
}
