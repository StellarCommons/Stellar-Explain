import { AnalyticsEvent } from "./types/events";

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

  constructor(private readonly onFlush: FlushCallback) {
    this.timer = setInterval(() => {
      void this.flush();
    }, QUEUE_FLUSH_INTERVAL_MS);
  }

  /**
   * Add an event to the queue. If the queue has reached `QUEUE_MAX_SIZE`
   * a flush is triggered immediately (non-blocking).
   */
  enqueue(event: AnalyticsEvent): void {
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
      console.error("[analytics] EventQueue flush error:", err);
    } finally {
      this.flushing = false;
    }
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
