/**
 * Analytics #41 — Event schema validation (issue #930).
 *
 * Validates each {@link AnalyticsEvent} against its expected shape before
 * it enters the queue. Invalid events are logged as warnings and dropped.
 */

import { AnalyticsEvent, EventName } from "./types/events";
import { Logger, defaultLogger } from "./lib/logger";

export interface ValidationResult {
  valid: boolean;
  /** Human-readable reason when `valid` is false. */
  reason?: string;
}

/**
 * Validate a single analytics event.
 *
 * Rules:
 * - `id`        — must be a non-empty string.
 * - `name`      — must be one of the known {@link EventName} values.
 * - `timestamp` — must be a `Date` instance.
 * - `properties`— when present, must be a plain object (not an array or primitive).
 * - `sessionId` — when present, must be a non-empty string.
 * - `userId`    — when present, must be a non-empty string.
 */
export function validateEvent(event: unknown): ValidationResult {
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, reason: "event must be a plain object" };
  }

  const e = event as Record<string, unknown>;

  if (typeof e.id !== "string" || e.id.trim() === "") {
    return { valid: false, reason: "event.id must be a non-empty string" };
  }

  if (typeof e.name !== "string" || !(EventName as readonly string[]).includes(e.name)) {
    return {
      valid: false,
      reason: `event.name "${String(e.name)}" is not a recognised EventName`,
    };
  }

  if (!(e.timestamp instanceof Date) || isNaN(e.timestamp.getTime())) {
    return { valid: false, reason: "event.timestamp must be a valid Date instance" };
  }

  if (
    e.properties !== undefined &&
    (typeof e.properties !== "object" ||
      e.properties === null ||
      Array.isArray(e.properties))
  ) {
    return { valid: false, reason: "event.properties must be a plain object when provided" };
  }

  if (e.sessionId !== undefined && (typeof e.sessionId !== "string" || e.sessionId.trim() === "")) {
    return { valid: false, reason: "event.sessionId must be a non-empty string when provided" };
  }

  if (e.userId !== undefined && (typeof e.userId !== "string" || e.userId.trim() === "")) {
    return { valid: false, reason: "event.userId must be a non-empty string when provided" };
  }

  return { valid: true };
}

/**
 * Validate *event* and return it typed as {@link AnalyticsEvent} if valid,
 * or `null` if it fails validation (after logging a warning).
 */
export function validateOrDrop(
  event: unknown,
  logger: Logger = defaultLogger,
): AnalyticsEvent | null {
  const result = validateEvent(event);
  if (!result.valid) {
    logger.warn(`[analytics] dropped invalid event: ${result.reason}`, {
      event,
    });
    return null;
  }
  return event as AnalyticsEvent;
}
