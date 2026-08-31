export interface VisibilityChangeProperties {
  /** Whether the document is now hidden or visible. */
  state: "hidden" | "visible";
  /** Duration in ms the document was hidden before becoming visible again (only set when state is "visible"). */
  hiddenDurationMs?: number;
  [key: string]: unknown;
}

export interface VisibilityChangeEvent {
  id: string;
  name: "visibility_change";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: VisibilityChangeProperties;
}

/**
 * Builds a `visibility_change` event recording when the user hides or shows
 * the browser tab.
 *
 * @param state            - "hidden" or "visible".
 * @param hiddenDurationMs - How long the tab was hidden (only when becoming visible).
 */
export function buildVisibilityChangeEvent(
  state: "hidden" | "visible",
  hiddenDurationMs?: number,
): VisibilityChangeEvent {
  return {
    id: crypto.randomUUID(),
    name: "visibility_change",
    timestamp: new Date(),
    properties: {
      state,
      ...(hiddenDurationMs !== undefined ? { hiddenDurationMs } : {}),
    },
  };
}
