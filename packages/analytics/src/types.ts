/**
 * Represents a single analytics event to be tracked and emitted.
 */
/** Core analytics event shape. */
export interface AnalyticsEvent {
  /** Unique event identifier (UUID). */
  id: string;
  /** Human-readable event name, e.g. "page_view". */
  name: string;
  /** Arbitrary key/value properties attached to the event. */
export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  properties: Record<string, unknown>;
}
  /** ISO-8601 timestamp of when track() was called. */
  timestamp: string;
}
