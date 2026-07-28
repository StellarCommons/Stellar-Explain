import { AnalyticsEvent } from "../types/events";

/**
 * Logs each analytics event to the console in a structured, human-readable
 * format.
 *
 * Output format:
 *   [analytics] <name> <ISO-timestamp> <JSON properties>
 */
export class ConsoleSink {
  send(event: AnalyticsEvent): void {
    const timestamp = event.timestamp instanceof Date
      ? event.timestamp.toISOString()
      : String(event.timestamp);

    console.log(
      `[analytics] ${event.name} ${timestamp}`,
      event.properties ?? {},
    );
  }
}
