import { describe, it, expect, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../src/lib/circuitBreaker';

describe('CircuitBreaker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closed and allows requests', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe('closed');
    expect(breaker.canProceed()).toBe(true);
  });

  it('opens after failureThreshold consecutive failures (#81)', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    expect(breaker.canProceed()).toBe(false);
  });

  it('resets the failure count on success', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });

    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');
  });

  it('moves to half-open after the cooldown and allows exactly one trial (#83)', () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    expect(breaker.canProceed()).toBe(false);

    vi.advanceTimersByTime(1000);

    expect(breaker.canProceed()).toBe(true);
    expect(breaker.getState()).toBe('half-open');

    // A second call while the trial is outstanding is refused.
    expect(breaker.canProceed()).toBe(false);
  });

  it('closes the circuit when the half-open trial succeeds', () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });

    breaker.recordFailure();
    vi.advanceTimersByTime(1000);
    breaker.canProceed(); // consumes the trial, transitions to half-open

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
    expect(breaker.canProceed()).toBe(true);
  });

  it('re-opens the circuit when the half-open trial fails', () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });

    breaker.recordFailure();
    vi.advanceTimersByTime(1000);
    breaker.canProceed(); // transitions to half-open

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    expect(breaker.canProceed()).toBe(false);
  });
});
