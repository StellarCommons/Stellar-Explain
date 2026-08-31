import { AnalyticsEvent } from "./types/events";
import { EventDeduplicator } from "./dedup";
import { Logger, defaultLogger } from "./lib/logger";

export interface EventQueueOptions {
  /** Injectable for testing — defaults to the package's shared console logger. */
  logger?: Logger;
}

/** Maximum number of events held before an automatic flush is triggered. */
export const QUEUE_MAX_SIZE = 20;

/** Milliseconds between automatic periodic flushes. */
export const QUEUE_FLUSH_INTERVAL_MS = 30_000;

export type FlushCallback = (batch: AnalyticsEvent[]) => void | Promise<void>;

/**
 * In-memory event queue for the analytics pipeline.
 *
 * Events are flushed automatically when either:
 *   - the queue reaches `QUEUE_MAX_SIZE` (20 events), or
 *   - `QUEUE_FLUSH_INTERVAL_MS` (30 s) elapses since the last flush.
 *
 * The flush callback receives the full batch and is responsible for
 * delivery (e.g. POSTing to an HTTP sink). Errors thrown by the callback
 * are caught and logged so the queue can continue operating.
 *
 * Call `destroy()` to cancel the periodic timer when the queue is no
 * longer needed (e.g. during teardown or testing).
 */
export class EventQueue {
  private items: AnalyticsEvent[] = [];
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly deduplicator = new EventDeduplicator();
  private readonly logger: Logger;

  constructor(
    private readonly onFlush: FlushCallback,
    options: EventQueueOptions = {},
  ) {
    this.logger = options.logger ?? defaultLogger;
    this.timer = setInterval(() => {
      void this.flush();
    }, QUEUE_FLUSH_INTERVAL_MS);
  }

  /**
   * Add an event to the queue. If the queue has reached `QUEUE_MAX_SIZE`
   * a flush is triggered immediately (non-blocking).
   *
   * A repeat of the same event name+properties within the deduplication
   * window (see `EventDeduplicator`) is silently dropped rather than
   * enqueued — useful for double-fired listeners or accidental double
   * clicks, which would otherwise inflate the event count.
   */
  enqueue(event: AnalyticsEvent): void {
    if (!this.deduplicator.shouldKeep(event)) return;

    this.items.push(event);
    if (this.items.length >= QUEUE_MAX_SIZE) {
      void this.flush();
    }
  }

  /**
   * Drain all queued events and deliver them to the flush callback as a
   * single batch.
   *
   * Concurrent calls are collapsed: if a flush is already in progress the
   * second call returns immediately without double-sending.
   */
  async flush(): Promise<void> {
    if (this.flushing || this.items.length === 0) return;

    this.flushing = true;
    const batch = this.items.splice(0, this.items.length);

    try {
      await this.onFlush(batch);
    } catch (err) {
      this.logger.error("[analytics] EventQueue flush error", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Synchronously remove and return every queued event without invoking the
   * flush callback.
   *
   * Used for best-effort delivery during page unload, where async work is
   * not guaranteed to complete before the page is torn down.
   */
  takePending(): AnalyticsEvent[] {
    return this.items.splice(0, this.items.length);
  }

  /** Number of events currently held in the queue. */
  size(): number {
    return this.items.length;
  }

  /**
   * Cancel the periodic flush timer.
   * Always call this when the queue is being torn down to avoid timer leaks.
   */
  destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
