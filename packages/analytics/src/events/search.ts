import { SearchEvent } from "../types";

/**
 * Builds a `search` event recorded when a user performs a transaction or
 * account lookup.
 *
 * @param type - The resource type that was looked up, e.g. "tx" or "account".
 * @param identifier - The transaction hash or account address that was looked up.
 * @param responseTimeMs - Optional duration of the corresponding API call.
 */
export function buildSearchEvent(
  type: string,
  identifier: string,
  responseTimeMs?: number,
): SearchEvent {
 */
export function buildSearchEvent(type: string, identifier: string): SearchEvent {
  return {
    id: crypto.randomUUID(),
    name: "search",
    timestamp: new Date(),
    properties: {
      type,
      identifier,
      ...(responseTimeMs !== undefined ? { responseTimeMs } : {}),
    },
    properties: { type, identifier },
  };
}