export interface HistorySelectProperties {
  /** What was selected from the history panel, e.g. "tx" or "account". */
  type: string;
  [key: string]: unknown;
}

export interface HistorySelectEvent {
  id: string;
  name: "history_select";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: HistorySelectProperties;
}

/**
 * Builds a `history_select` event recorded when a user clicks a history entry
 * to reload a result.
 *
 * @param type - The kind of result being reloaded, e.g. "tx" or "account".
 */
export function buildHistorySelectEvent(type: string): HistorySelectEvent {
  return {
    id: crypto.randomUUID(),
    name: "history_select",
    timestamp: new Date(),
    properties: { type },
  };
}

export interface HistoryOpenProperties {
  /** Page path where the history panel was opened, when known. */
  path?: string;
  [key: string]: unknown;
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