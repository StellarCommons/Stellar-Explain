/**
 * #93 — client-side token-bucket rate limiter.
 *
 * New events are allowed as long as the bucket holds at least one token;
 * tokens refill continuously at the configured events-per-second rate up to
 * the bucket capacity. When the bucket is empty the event is dropped (the
 * caller decides how to report that).
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly maxPerSecond: number) {
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Decide whether an event may be sent right now. Consumes one token when
   * available, refilling from the elapsed time first.
   *
   * @returns `true` if the event should be sent, else `false` (rate-limited).
   */
  allow(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Tokens currently available (fractional). */
  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /** Reset the bucket to full capacity. */
  reset(): void {
    this.tokens = this.maxPerSecond;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    // Guard against clock skew / fake-timer noise: never apply a negative or
    // sub-token refill. Only whole tokens are added.
    if (elapsedMs < 0) {
      this.lastRefill = now;
      return;
    }
    const addedTokens = Math.floor((elapsedMs / 1000) * this.maxPerSecond);
    if (addedTokens <= 0) return;
    this.tokens = Math.min(this.maxPerSecond, this.tokens + addedTokens);
    this.lastRefill = now;
  }
}