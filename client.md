
import { buildResultViewEvent } from "./events/result-view";
import { buildErrorEvent } from "./events/error";
import { buildCopyEvent } from "./events/copy";
import { buildRageClickEvent } from "./events/rage-click";
import { buildNetworkErrorEvent } from "./events/network-error";
import { getSessionId } from "./session";
import { getUserId } from "./user";
import { getUserId, hasExistingUserId } from "./user";

import { validateOrDrop } from "./validate";
import { resolveEndpoint } from "./config";
   * (with a console warning) rather than blocking the others.
   */
  plugins?: AnalyticsPlugin[];

  /**
   * When `true` (default), the client intercepts the global `fetch` to
   * track network errors as `network_error` events. Set to `false` to
   * disable automatic network error tracking.
   */
  trackNetworkErrors?: boolean;
}

// ---------------------------------------------------------------------------

  private readonly onPageHide: (() => void) | undefined;
  private readonly onRouteChange: (() => void) | undefined;
  private readonly onRageClick: (() => void) | undefined;
  private readonly _originalFetch: typeof fetch | undefined;

  constructor(config: AnalyticsClientConfig = {}) {
    this.config = config;

    this.onPageHide = this._bindUnloadFlush();
    this.onRouteChange = this._bindPageViewTracking();
    this.onRageClick = this._bindRageClickTracking();
    this._originalFetch = this._interceptFetch();
  }

  // -------------------------------------------------------------------------
      buildPageViewEvent(path ?? currentPath(), {
        title: documentTitle(),
        includeColorScheme: !this.hasTrackedPageView,
        isReturning: hasExistingUserId(),
      }),
    );
    this.hasTrackedPageView = true;
      window.removeEventListener("popstate", this.onRouteChange);
      window.removeEventListener("hashchange", this.onRouteChange);
    }
    if (this.onRageClick) {
      window.removeEventListener("click", this.onRageClick);
    }
    if (this._originalFetch && typeof window.fetch !== "undefined") {
      window.fetch = this._originalFetch;
    }
  }

  // -------------------------------------------------------------------------
  }

  /**
   * Registers a click listener that detects rage clicks (3+ clicks within
   * 400ms on the same element) and tracks them as `rage_click` events.
   * Returns `undefined` when not in a browser environment.
   */
  private _bindRageClickTracking(): (() => void) | undefined {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const RAGE_CLICK_THRESHOLD = 3;
    const RAGE_CLICK_WINDOW_MS = 400;

    /** Stores recent clicks per element, keyed by a generated selector. */
    const clickHistory = new Map<string, number[]>();

    const handler = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const selector = getCssSelector(target);
      const now = Date.now();

      let timestamps = clickHistory.get(selector);
      if (!timestamps) {
        timestamps = [];
        clickHistory.set(selector, timestamps);
      }

      // Prune clicks outside the detection window
      while (timestamps.length > 0 && timestamps[0]! < now - RAGE_CLICK_WINDOW_MS) {
        timestamps.shift();
      }

      timestamps.push(now);

      if (timestamps.length >= RAGE_CLICK_THRESHOLD) {
        const timeSpanMs = now - timestamps[0]!;
        this.track(buildRageClickEvent({
          selector,
          clickCount: timestamps.length,
          timeSpanMs,
        }));
        // Clear after reporting to avoid duplicate events
        clickHistory.delete(selector);
      }
    };

    window.addEventListener("click", handler);
    return handler;
  }

  /**
   * Intercepts the global `fetch` to track network errors as `network_error`
   * events. Returns the original `fetch` reference so `destroy()` can
   * restore it. No-op when not in a browser or when `trackNetworkErrors`
   * is `false`.
   */
  private _interceptFetch(): typeof fetch | undefined {
    if (this.config.trackNetworkErrors === false) return undefined;
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return undefined;
    }

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const startTime = Date.now();

      try {
        const response = await originalFetch.call(this, input, init);
        const responseTimeMs = Date.now() - startTime;

        // Track server errors (4xx/5xx)
        if (!response.ok) {
          self.track(buildNetworkErrorEvent({
            url,
            statusCode: response.status,
            responseTimeMs,
            message: `${response.status} ${response.statusText}`,
          }));
        }

        return response;
      } catch (error) {
        const responseTimeMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);

        self.track(buildNetworkErrorEvent({
          url,
          responseTimeMs,
          message,
        }));

        throw error;
      }
    } as typeof fetch;

    return originalFetch;
  }

  /**
   * Resolves the client's opt-out state once, at construction time.
   *
   * - A `stellar-explain-analytics-optout` localStorage flag disables
  return document.title;
}

/**
 * Generates a best-effort CSS selector string for an element, used as the
 * key for rage-click deduplication. Prefers id > unique attributes >
 * tagName with index. This is intentionally lightweight — it never
 * traverses the full ancestor chain.
 */
function getCssSelector(el: Element): string {
  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const name = (el as HTMLElement).name;
  const type = (el as HTMLElement).getAttribute("type");
  const role = el.getAttribute("role");

  const attrs: string[] = [];
  if (name) attrs.push(`name="${name}"`);
  if (type) attrs.push(`type="${type}"`);
  if (role) attrs.push(`role="${role}"`);

  if (attrs.length > 0) {
    return `${tag}[${attrs.join(", ")}]`;
  }

  return tag;
}


// Support manual queue reset and flush intervals
export function reset() {}
export function flush() {}