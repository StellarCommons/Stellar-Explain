/**
 * Represents a single analytics event to be tracked and emitted.
 */
export interface AnalyticsEvent {
  /** The name identifying the event (e.g. "page_view", "button_click"). */
  name: string;
  /** Unix timestamp (ms) at the moment the event was created. */
  timestamp: number;
  /** Arbitrary serializable key-value metadata attached to the event. */
  properties: Record<string, unknown>;
}