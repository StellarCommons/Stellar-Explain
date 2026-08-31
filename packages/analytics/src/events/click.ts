export interface ClickProperties {
  /** The human-readable label of the clicked element (e.g. button text or link text). */
  label: string;
  /** Optional HTML tag name of the clicked element. */
  element?: string;
  /** Optional page path where the click occurred. */
  path?: string;
  [key: string]: unknown;
}

export interface ClickEvent {
  id: string;
  name: "click";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ClickProperties;
}

/**
 * Builds a `click` event recording a click on a button or link.
 *
 * @param label    - The human-readable label of the clicked element.
 * @param options  - Optional element tag and page path metadata.
 */
export function buildClickEvent(
  label: string,
  options: { element?: string; path?: string } = {},
): ClickEvent {
  return {
    id: crypto.randomUUID(),
    name: "click",
    timestamp: new Date(),
    properties: {
      label,
      ...(options.element !== undefined ? { element: options.element } : {}),
      ...(options.path !== undefined ? { path: options.path } : {}),
    },
  };
}
