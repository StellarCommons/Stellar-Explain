/**
 * #88 — PII scrubbing.
 *
 * Recursively scrubs values that look like personally-identifiable
 * information out of event properties:
 *  - email addresses → `[email]`
 *  - long numeric strings (e.g. phone/credit-card shaped, >= 12 digits) → `[long-number]`
 *
 * Keys are left as-is; only values are scrubbed so event structure is intact.
 */

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LONG_NUMBER_PATTERN = /\b\d{12,}\b/g;

export const SCRUBBED_EMAIL = '[email]';
export const SCRUBBED_LONG_NUMBER = '[long-number]';

export function scrubPiiString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, SCRUBBED_EMAIL)
    .replace(LONG_NUMBER_PATTERN, SCRUBBED_LONG_NUMBER);
}

export function scrubPii(value: unknown): unknown {
  if (typeof value === 'string') {
    return scrubPiiString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubPii(entry));
  }
  if (value !== null && typeof value === 'object') {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      record[key] = scrubPii(entry);
    }
    return record;
  }
  return value;
}

export function scrubEventProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    result[key] = scrubPii(value);
  }
  return result;
}