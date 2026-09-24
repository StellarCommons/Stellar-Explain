import type { AnalyticsEvent } from '../types.js';

/** Return the UTF-8 byte length of a serialized value. */
export function serializedByteLength(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return 0;

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).byteLength;
  }

  // TextEncoder is available in supported runtimes, but retain a small fallback
  // for older browsers and test doubles.
  let bytes = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < serialized.length) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** Serialize one complete event, including context and properties. */
export function eventByteLength(event: AnalyticsEvent): number {
  return serializedByteLength(event);
}

/** Whether an event fits within an optional byte cap. */
export function isWithinByteLimit(event: AnalyticsEvent, maxBytes: number): boolean {
  return maxBytes <= 0 || eventByteLength(event) <= maxBytes;
}
