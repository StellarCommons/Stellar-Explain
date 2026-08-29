export interface TabSwitchProperties {
  /** The tab the user switched from, e.g. "transaction" or "account". */
  from: string;
  /** The tab the user switched to. */
  to: string;
}

export interface TabSwitchEvent {
  id: string;
  name: "tab_switch";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: TabSwitchProperties;
}

/**
 * Builds a `tab_switch` event recorded when a user switches between the
 * Transaction and Account tabs.
 *
 * @param from - The tab the user switched from.
 * @param to - The tab the user switched to.
 */
export function buildTabSwitchEvent(from: string, to: string): TabSwitchEvent {
  return {
    id: crypto.randomUUID(),
    name: "tab_switch",
    timestamp: new Date(),
    properties: { from, to },
  };
}