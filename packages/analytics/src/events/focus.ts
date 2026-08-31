export interface WindowFocusProperties {
  [key: string]: unknown;
}

export interface WindowFocusEvent {
  id: string;
  name: "window_focus";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: WindowFocusProperties;
}

export interface WindowBlurProperties {
  /** How long (ms) the window was blurred before regaining focus (set on the next focus event). */
  awayDurationMs?: number;
  [key: string]: unknown;
}

export interface WindowBlurEvent {
  id: string;
  name: "window_blur";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: WindowBlurProperties;
}

/**
 * Builds a `window_focus` event recording when the window regains focus.
 */
export function buildWindowFocusEvent(): WindowFocusEvent {
  return {
    id: crypto.randomUUID(),
    name: "window_focus",
    timestamp: new Date(),
    properties: {},
  };
}

/**
 * Builds a `window_blur` event recording when the window loses focus.
 */
export function buildWindowBlurEvent(): WindowBlurEvent {
  return {
    id: crypto.randomUUID(),
    name: "window_blur",
    timestamp: new Date(),
    properties: {},
  };
}
