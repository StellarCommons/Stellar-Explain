export interface BackButtonProperties {
  /** Where the user came back from, e.g. "result" or "account". */
  from: string;
}

export interface BackButtonEvent {
  id: string;
  name: "back_button";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: BackButtonProperties;
}

/**
 * Builds a `back_button` event recorded when a user clicks the back button
 * on a result page.
 *
 * @param from - The page or state the user navigated back from.
 */
export function buildBackButtonEvent(from: string): BackButtonEvent {
  return {
    id: crypto.randomUUID(),
    name: "back_button",
    timestamp: new Date(),
    properties: { from },
  };
}