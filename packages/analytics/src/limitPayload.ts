import { AnalyticsEvent } from "./types/events";

const DEFAULT_MAX_BYTES = 1024; // 1 KB per property value
const TRUNCATION_SUFFIX = "...[truncated]";

/**
 * Limits individual string property values that exceed `maxBytes` characters.
 *
 * - Values shorter than or equal to `maxBytes` are left untouched.
 * - Values exceeding the limit are truncated and a `_truncated: true` flag is
 *   added to `event.properties`.
 * - The event object itself is never mutated — a new object is returned.
 */
export function limitPayload(
  event: AnalyticsEvent,
  maxBytes = DEFAULT_MAX_BYTES,
): AnalyticsEvent {
  if (!event.properties || Object.keys(event.properties).length === 0) {
    return event;
  }

  let didTruncate = false;
  const limitedProperties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event.properties)) {
    if (typeof value === "string" && value.length > maxBytes) {
      limitedProperties[key] = value.slice(0, maxBytes) + TRUNCATION_SUFFIX;
      didTruncate = true;
    } else {
      limitedProperties[key] = value;
    }
  }

  if (!didTruncate) {
    return event;
  }

  return {
    ...event,
    properties: {
      ...limitedProperties,
      _truncated: true,
    },
  };
}
