import { AnalyticsEvent, EventName } from "../types/events";
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from "../lib/circuitBreaker";
import { Logger, defaultLogger } from "../lib/logger";

export type EventHandler = (event: AnalyticsEvent) => void | Promise<void>;

export interface EventEmitterMetrics {
  totalTracked: number;
  totalDropped: number;
  totalFlushed: number;
  queueSize: number;
  /** Cumulative count of handler errors (issue #95's "sink" failures). */
  sinkErrors: number;
  /** Number of events currently held for inspection after failed delivery. */
  deadLetterSize: number;
  circuitState: CircuitState;
}

export interface EventEmitterOptions {
  /** Injectable for testing — defaults to the package's shared console logger. */
  logger?: Logger;
  circuitBreaker?: CircuitBreakerOptions;
}

/** Bound on the dead-letter queue so a sustained outage can't grow it unboundedly. */
const DEAD_LETTER_CAP = 100;

function isThenable(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}

export class EventEmitter {
  private queue: AnalyticsEvent[] = [];
  private handlers: Map<EventName, EventHandler[]> = new Map();
  private draining = false;
  private readonly logger: Logger;
  private readonly circuit: CircuitBreaker;
  private readonly deadLetter: AnalyticsEvent[] = [];

  private totalTracked = 0;
  private totalDropped = 0;
  private totalFlushed = 0;
  private sinkErrors = 0;

  constructor(options: EventEmitterOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.circuit = new CircuitBreaker(options.circuitBreaker);
  }

  on(eventName: EventName, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  off(eventName: EventName, handler: EventHandler): void {
    const existing = this.handlers.get(eventName);
    if (!existing) return;
    const filtered = existing.filter((h) => h !== handler);
    if (filtered.length === 0) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.set(eventName, filtered);
    }
  }

  track(event: AnalyticsEvent): void {
    if (!EventName.includes(event.name)) {
      this.totalDropped++;
      this.logger.warn(`Analytics: dropped unknown event "${event.name}"`, {
        eventName: event.name,
      });
      return;
    }
    this.totalTracked++;
    this.queue.push(event);
    if (!this.draining) {
      this.draining = true;
      // Fire-and-forget from the caller's perspective (issue #95): flush()
      // catches every handler failure itself, so this can never reject.
      void this.flush();
    }
  }

  /**
   * Drains the queue, dispatching each event to its registered handlers.
   * A handler that throws synchronously or returns a rejected promise (e.g.
   * `HttpSink.send`) is caught here — logged, counted in `sinkErrors`, and
   * never propagated to the caller. While the circuit breaker is open,
   * remaining queued events are moved straight to the dead-letter queue
   * without an attempt, since delivery is known to be failing.
   */
  async flush(): Promise<void> {
    try {
      while (this.queue.length > 0) {
        if (!this.circuit.canPass()) {
          const remaining = this.queue.splice(0, this.queue.length);
          this.totalDropped += remaining.length;
          this.pushDeadLetter(...remaining);
          break;
        }

        const event = this.queue.shift()!;
        const handlers = this.handlers.get(event.name) ?? [];
        let failed = false;
        for (const handler of handlers) {
          try {
            const result = handler(event);
            if (isThenable(result)) {
              await result;
            }
          } catch (err) {
            failed = true;
            this.sinkErrors++;
            this.logger.error(`Analytics: handler error for "${event.name}"`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (failed) {
          this.circuit.recordFailure();
          this.pushDeadLetter(event);
        } else {
          this.circuit.recordSuccess();
          this.totalFlushed++;
        }
      }
    } finally {
      this.draining = false;
    }
  }

  queueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  /** Events that failed delivery (or were dropped by an open circuit), most recent last. */
  getDeadLetterQueue(): AnalyticsEvent[] {
    return [...this.deadLetter];
  }

  metrics(): EventEmitterMetrics {
    return {
      totalTracked: this.totalTracked,
      totalDropped: this.totalDropped,
      totalFlushed: this.totalFlushed,
      queueSize: this.queue.length,
      sinkErrors: this.sinkErrors,
      deadLetterSize: this.deadLetter.length,
      circuitState: this.circuit.getState(),
    };
  }

  private pushDeadLetter(...events: AnalyticsEvent[]): void {
    this.deadLetter.push(...events);
    const overflow = this.deadLetter.length - DEAD_LETTER_CAP;
    if (overflow > 0) {
      this.deadLetter.splice(0, overflow);
    }
  }
}
