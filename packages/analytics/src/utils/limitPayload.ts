import type { AnalyticsEvent } from "../types/events";

/** Default maximum byte-length for any single string property value. */
export const DEFAULT_MAX_BYTES = 1024;

/**
 * Truncates string properties inside `event.properties` that exceed
 * `maxBytes` in UTF-8 byte length.
 *
 * If any property is truncated the returned event will have
 * `properties._truncated === true` so downstream consumers can flag it.
 *
 * Events without `properties`, or with all properties within limits, are
 * returned unchanged (same reference).
 */
export function limitPayload(
  event: AnalyticsEvent,
  maxBytes = DEFAULT_MAX_BYTES,
): AnalyticsEvent {
  if (!event.properties) return event;

  let didTruncate = false;
  const limited: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event.properties)) {
    if (typeof value === "string") {
      const encoded = new TextEncoder().encode(value);
      if (encoded.byteLength > maxBytes) {
        // Decode the first `maxBytes` bytes back to a valid UTF-8 string.
        limited[key] = new TextDecoder().decode(encoded.slice(0, maxBytes));
        didTruncate = true;
      } else {
        limited[key] = value;
      }
    } else {
      limited[key] = value;
    }
  }

  if (!didTruncate) return event;

  return {
    ...event,
    properties: {
      ...limited,
      _truncated: true,
    },
  };
}
