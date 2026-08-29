import { ResultViewTrackEvent } from "../types";

/**
 * Builds a `result_view` event recorded when a result page finishes rendering.
 *
 * @param type - The kind of result page that was rendered, "tx" or "account".
 * @param success - Whether the result page rendered successfully.
 */
export function buildResultViewEvent(
  type: "tx" | "account",
  success: boolean,
): ResultViewTrackEvent {
  return {
    id: crypto.randomUUID(),
    name: "result_view",
    timestamp: new Date(),
    properties: { type, success },
  };
}