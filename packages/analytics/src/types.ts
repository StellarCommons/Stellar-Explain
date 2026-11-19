/**
 * Represents a single analytics event to be tracked and emitted.
 */
export interface AnalyticsEvent {
  /** Human-readable event name, e.g. "page_view". */
  name: string;
  /**
   * Epoch milliseconds at which `track()` was called.
   *
   * A number rather than an ISO string: the client and its tests treat this as
   * epoch millis, and `Date.now()` is what the client actually has; HttpSink
   * converts it to Unix seconds on the wire.
   */
  timestamp: number;
  /** Arbitrary key/value properties attached to the event. */
  properties: Record<string, unknown>;
}