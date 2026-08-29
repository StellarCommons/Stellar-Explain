export interface HistoryOpenProperties {
  /** Page path where the history panel was opened, when known. */
  path?: string;
}

export interface HistoryOpenEvent {
  id: string;
  name: "history_open";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: HistoryOpenProperties;
}

/**
 * Builds a `history_open` event recorded when a user opens the history panel.
 */
export function buildHistoryOpenEvent(): HistoryOpenEvent {
  return {
    id: crypto.randomUUID(),
    name: "history_open",
    timestamp: new Date(),
    properties: {},
  };
}