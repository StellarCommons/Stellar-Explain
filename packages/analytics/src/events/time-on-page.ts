export interface TimeOnPageProperties {
  /** Elapsed time in seconds spent on the page before navigating away. */
  seconds: number;
}

export interface TimeOnPageEvent {
  id: string;
  name: "time_on_page";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: TimeOnPageProperties;
}

/**
 * Builds a `time_on_page` event recording how long a user spent on a result
 * page, in seconds.
 *
 * @param seconds - The elapsed time on the page, in seconds.
 */
export function buildTimeOnPageEvent(seconds: number): TimeOnPageEvent {
  return {
    id: crypto.randomUUID(),
    name: "time_on_page",
    timestamp: new Date(),
    properties: { seconds },
  };
}