import { AnalyticsEvent, EventName } from "../types/events";
import { EventHandler, EventEmitterMetrics } from "./EventEmitter";

/**
 * A drop-in stand-in for `EventEmitter` that discards everything (issue
 * #96). Used automatically outside the browser — server-side rendering,
 * static generation — so analytics calls made during SSR never queue
 * events, register handlers, or reach a sink.
 */
export class NoopEmitter {
  on(_eventName: EventName, _handler: EventHandler): void {}

  off(_eventName: EventName, _handler: EventHandler): void {}

  track(_event: AnalyticsEvent): void {}

  async flush(): Promise<void> {}

  clear(): void {}

  queueSize(): number {
    return 0;
  }

  getDeadLetterQueue(): AnalyticsEvent[] {
    return [];
  }

  metrics(): EventEmitterMetrics {
    return {
      totalTracked: 0,
      totalDropped: 0,
      totalFlushed: 0,
      queueSize: 0,
      sinkErrors: 0,
      deadLetterSize: 0,
      circuitState: "closed",
    };
  }
}
