import { AnalyticsEvent } from "./types/events";

/**
 * A middleware function called on every event before it is enqueued.
 *
 * - Return an `AnalyticsEvent` to transform the event (e.g. add properties).
 * - Return `undefined` to drop the event entirely.
 * - Throw to drop the event; a console warning will be logged.
 */
export type EventMiddleware = (
  event: AnalyticsEvent,
) => AnalyticsEvent | undefined;

/**
 * Runs a chain of middleware functions on the given event. Each middleware
 * receives the event returned by the previous one. If any middleware returns
 * `undefined` or throws, the chain short-circuits and returns `undefined`.
 *
 * @param middleware - Array of middleware functions to run in order.
 * @param event      - The event to process.
 * @returns The transformed event, or `undefined` if the event was dropped.
 */
export function runMiddleware(
  middleware: readonly EventMiddleware[],
  event: AnalyticsEvent,
): AnalyticsEvent | undefined {
  let current: AnalyticsEvent | undefined = event;
  for (const fn of middleware) {
    if (current === undefined) return undefined;
    try {
      current = fn(current);
    } catch (err) {
      console.warn("[analytics] middleware threw:", err);
      return undefined;
    }
  }
  return current;
}
