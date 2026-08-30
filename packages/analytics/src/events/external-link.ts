export interface ExternalLinkClickProperties {
  /** The destination URL that was clicked. */
  url: string;
  /** Page path where the click occurred, when known. */
  path?: string;
  [key: string]: unknown;
}

export interface ExternalLinkClickEvent {
  id: string;
  name: "external_link_click";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ExternalLinkClickProperties;
}

/**
 * Builds an `external_link_click` event recording a click on an external
 * link (a link whose origin differs from the current page).
 *
 * @param url  - The full destination URL.
 * @param path - Optional page path where the click occurred.
 */
export function buildExternalLinkClickEvent(
  url: string,
  path?: string,
): ExternalLinkClickEvent {
  return {
    id: crypto.randomUUID(),
    name: "external_link_click",
    timestamp: new Date(),
    properties: {
      url,
      ...(path !== undefined ? { path } : {}),
    },
  };
}

/**
 * Returns `true` when the given URL points to a different origin than the
 * current page.  Always returns `false` outside the browser.
 */
export function isExternalLink(url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const target = new URL(url, window.location.href);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
}
