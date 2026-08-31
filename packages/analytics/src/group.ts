import { AnalyticsEvent } from "./types/events";

/**
 * Organisation/workspace-level tracking context (issue #86).
 *
 * Set via `AnalyticsClient.group()` and held in memory for the life of the
 * client — not persisted, matching `identify()`'s in-memory-only contract.
 */
export interface GroupContext {
  groupId: string;
  properties?: Record<string, unknown>;
}

/**
 * Attaches a group's ID and properties to an event.
 *
 * An event's own `groupId` always wins (mirrors `_attachIdentity`'s
 * event-provided-value-wins rule for `userId`/`sessionId`), and group
 * properties never override a key the event already set. Returns the event
 * unchanged when no group context has been set.
 */
export function attachGroupContext(
  event: AnalyticsEvent,
  group: GroupContext | undefined,
): AnalyticsEvent {
  if (!group) return event;

  return {
    ...event,
    groupId: event.groupId ?? group.groupId,
    properties:
      group.properties && Object.keys(group.properties).length > 0
        ? { ...group.properties, ...event.properties }
        : event.properties,
  };
}
