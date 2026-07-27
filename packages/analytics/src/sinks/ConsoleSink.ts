import type { AnalyticsEvent } from "../types/events";

/**
 * ConsoleSink — writes each analytics event to the console as a formatted
 * JSON log line.  Useful for development and debugging.
 */
export class ConsoleSink {
  send(event: AnalyticsEvent): void {
    console.log(
      JSON.stringify({
        level: "analytics",
        event: event.name,
        id: event.id,
        userId: event.userId ?? null,
        sessionId: event.sessionId ?? null,
        timestamp: event.timestamp.toISOString(),
        properties: event.properties ?? {},
      }),
    );
  }
}
