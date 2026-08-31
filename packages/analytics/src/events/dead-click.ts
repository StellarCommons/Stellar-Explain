export interface DeadClickProperties {
  /** The HTML tag name of the clicked element, e.g. "div", "span". */
  tag: string;
  /** CSS selector identifying the element, e.g. ".card > h3". */
  selector?: string;
  /** Page path where the dead click occurred. */
  path: string;
  /** Whether the element is inside an interactive ancestor (button, a, etc.). */
  inInteractiveAncestor: boolean;
  [key: string]: unknown;
}

export interface DeadClickEvent {
  id: string;
  name: "dead_click";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: DeadClickProperties;
}

/**
 * Builds a `dead_click` event recording a click on a non-interactive element.
 *
 * @param tag      - The HTML tag name of the clicked element.
 * @param selector - Optional CSS selector for the element.
 * @param path     - Page path where the click occurred.
 * @param inInteractiveAncestor - Whether the element is inside an interactive ancestor.
 */
export function buildDeadClickEvent(
  tag: string,
  selector: string | undefined,
  path: string,
  inInteractiveAncestor: boolean,
): DeadClickEvent {
  return {
    id: crypto.randomUUID(),
    name: "dead_click",
    timestamp: new Date(),
    properties: {
      tag,
      selector,
      path,
      inInteractiveAncestor,
    },
  };
}

/**
 * Determines whether an element is interactive (has href, onClick, role,
 * or is a known interactive tag like button/input/a/select/textarea).
 */
export function isInteractiveElement(el: Element): boolean {
  if (
    el instanceof HTMLAnchorElement ||
    el instanceof HTMLButtonElement ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  if (el.hasAttribute("href")) return true;
  if (el.hasAttribute("role")) return true;
  if (el.hasAttribute("onclick")) return true;

  // Check for any `on*` event handler attributes
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("on")) return true;
  }

  // Check for React-style onClick (stored as __reactEvents$ or similar on keys)
  const reactKeys = Object.keys(el).filter(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
  );
  for (const key of reactKeys) {
    try {
      const props = (el as unknown as Record<string, unknown>)[key];
      if (
        typeof props === "object" &&
        props !== null &&
        "onClick" in (props as Record<string, unknown>)
      ) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Walks up the DOM tree from the target to find an interactive ancestor.
 * Returns the first interactive ancestor element, or null.
 */
export function findInteractiveAncestor(el: Element): Element | null {
  let current: Element | null = el.parentElement;
  while (current && current !== document.body) {
    if (isInteractiveElement(current)) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Builds a CSS-like selector for an element.
 */
export function getSelector(el: Element): string | undefined {
  if (el.id) return `#${el.id}`;
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && parts.length < 3) {
    let part = current.tagName.toLowerCase();
    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join(".");
      if (classes) part += `.${classes}`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(" > ");
}
