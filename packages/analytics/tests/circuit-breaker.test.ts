import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../src/lib/CircuitBreaker.js';
import { AnalyticsClient } from '../src/index.js';

describe('#94 CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

import { describe, it, expect, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../src/lib/circuitBreaker';

describe('CircuitBreaker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in the closed state', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe('closed');
  });

  it('allows requests while closed', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.allowRequest()).toBe(true);
  });

  it('opens after the failure threshold is crossed', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.getState()).toBe('closed');
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');
  });

  it('short-circuits requests while open', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');
    expect(breaker.allowRequest()).toBe(false);
  });

  it('reopens after a half-open trial fails', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, openTimeoutMs: 1000 });
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');

    vi.advanceTimersByTime(1001);
    expect(breaker.allowRequest()).toBe(true); // half-open trial
    expect(breaker.getState()).toBe('half-open');

    breaker.onFailure();
    expect(breaker.getState()).toBe('open');
    expect(breaker.allowRequest()).toBe(false);
  });

  it('closes after a successful half-open trial', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, openTimeoutMs: 1000 });
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');

    vi.advanceTimersByTime(1001);
    expect(breaker.allowRequest()).toBe(true);
    breaker.onSuccess();
    expect(breaker.getState()).toBe('closed');
    expect(breaker.allowRequest()).toBe(true);
  });

  it('requires the full open timeout before trying again', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, openTimeoutMs: 5000 });
    breaker.onFailure();
    vi.advanceTimersByTime(4999);
    expect(breaker.allowRequest()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(breaker.allowRequest()).toBe(true);
  });

  it('a success while closed resets the failure count', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    breaker.onFailure();
    breaker.onFailure();
    breaker.onSuccess();
    breaker.onFailure();
    breaker.onFailure();
    // Reset meant the threshold was NOT yet reached after the two new failures.
    expect(breaker.getState()).toBe('closed');
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');
  });

  it('reset() returns the circuit to closed', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.onFailure();
    expect(breaker.getState()).toBe('open');
    breaker.reset();
    expect(breaker.getState()).toBe('closed');
    expect(breaker.allowRequest()).toBe(true);
  });
});

describe('#94 breaker wired into the client', () => {
  it('trip the breaker and short-circuit subsequent sends to the dead-letter', async () => {
    const failing = { send: vi.fn().mockRejectedValue(new Error('down')) };
    const client = new AnalyticsClient(
      { maxEventsPerSecond: 50 },
      failing,
    );

    // First three failures trip the breaker (threshold 3).
    client.track('a');
    client.track('b');
    client.track('c');
    await client.flush();

    expect(client.getCircuitBreaker().getState()).toBe('open');
    expect(client.getDeadLetter().size).toBe(3);
    expect(failing.send).toHaveBeenCalledTimes(3);

    // While open, further events never hit the emitter.
    client.track('d');
    await client.flush();
    expect(failing.send).toHaveBeenCalledTimes(3);
    expect(client.getDeadLetter().size).toBe(4);
  });
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
