import { AnalyticsEvent, EventName } from "./types/events";
import { EventQueue, FlushCallback } from "./queue";
import { StellarAnalyticsEvent } from "./types";
import { getConnectionType } from "./network";
import { isOptedOutViaDoNotTrack, isOptedOutViaLocalStorage } from "./optout";
import { shouldSample } from "./sampling";
import { buildTimeOnPageEvent } from "./events/time-on-page";
import { buildScrollDepthEvent, SCROLL_DEPTH_MILESTONES } from "./events/scroll-depth";
import { buildPageViewEvent } from "./events/page-view";
import { buildSearchEvent } from "./events/search";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AnalyticsClientConfig {
  /**
   * The endpoint that will receive batched events.
   * When omitted (e.g. in test environments) events are flushed to the
   * `onFlush` callback only.
   */
  endpoint?: string;

  /**
   * Custom HTTP headers forwarded on every batch POST request.
   * Merged on top of `{ "Content-Type": "application/json" }`.
   */
  headers?: Record<string, string>;

  /**
   * Override the flush callback entirely — useful for testing or custom sinks.
   * If both `endpoint` and `onFlush` are provided, `onFlush` takes precedence.
   */
  onFlush?: FlushCallback;

  /**
   * Injectable `fetch` implementation — defaults to the global `fetch`.
   * Useful for server-side environments or tests.
   */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;

  /**
   * When `true` the client accepts events regardless of the `DNT` header.
   * Defaults to `false` — Do Not Track is respected.
   */
  ignoreDnt?: boolean;

  /**
   * When `true`, emits `console.debug` diagnostics for internal state
   * changes — e.g. tracking being disabled by a Do Not Track signal.
   * Defaults to `false`.
   */
  debug?: boolean;

  /**
   * Fraction of events to keep, in the range `[0, 1]`. Defaults to `1`
   * (keep every event). Values below `1` randomly drop events per-call to
   * `track()` — useful for controlling ingestion cost on high-traffic
   * pages. Out-of-range values are clamped.
   */
  sampleRate?: number;

  /**
   * When `true` (default), the client records time spent on the page and
   * emits a `time_on_page` event when the page is unloaded. Set to `false`
   * to call `trackTimeOnPage(seconds)` from your own app code instead.
   */
  trackTimeOnPage?: boolean;

  /**
   * When `true` (default), the client watches scroll position and emits
   * `scroll_depth` events at 25%, 50%, 75%, and 100% scroll.
   * Set to `false` to call `trackScrollDepth(percent)` yourself instead.
   */
  trackScrollDepth?: boolean;
}

// ---------------------------------------------------------------------------
// AnalyticsClient
// ---------------------------------------------------------------------------

/**
 * High-level analytics client for Stellar Explain.
 *
 * Usage:
 * ```ts
 * const client = new AnalyticsClient({ endpoint: "https://api.example.com/events" });
 *
 * client.track({
 *   id: crypto.randomUUID(),
 *   name: "page_view",
 *   timestamp: new Date(),
 *   sessionId: "sess-abc",
 *   properties: { path: "/tx/abc123" },
 * });
 *
 * // On teardown:
 * await client.flush();
 * client.destroy();
 * ```
 *
 * Events are batched in an `EventQueue` and flushed automatically every
 * 30 seconds or when 20 events accumulate, whichever comes first.
 */
export class AnalyticsClient {
  private readonly config: AnalyticsClientConfig;
  private readonly queue: EventQueue;
  private readonly optedOut: boolean;

  /** Timestamp (ms) of the last page view, used for time-on-page tracking. */
  private pageStartMs: number | null = null;

  /** Scroll milestones already reported, to fire each one only once. */
  private readonly reportedScrollDepths: Set<number> = new Set();

  private readonly scrollHandler: (() => void) | undefined;
  private readonly timeOnPageHandler: (() => void) | undefined;

  constructor(config: AnalyticsClientConfig = {}) {
    this.config = config;
    this.queue = new EventQueue(this._buildFlushCallback());
    this.optedOut = this._checkOptOut();

    this.scrollHandler = this._bindScrollDepthTracking();
    this.timeOnPageHandler = this._bindTimeOnPageTracking();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Queue an analytics event for delivery.
   *
   * - Unknown event names are silently dropped with a console warning.
   * - A `StellarAnalyticsEvent` can be passed directly; it is widened to
   *   `AnalyticsEvent` internally.
   */
  track(event: AnalyticsEvent | StellarAnalyticsEvent): void {
    if (this.optedOut) return;

    const base = event as AnalyticsEvent;

    if (!EventName.includes(base.name as EventName)) {
      console.warn(`[analytics] dropped unknown event "${base.name}"`);
      return;
    }

    if (this.config.sampleRate !== undefined && !shouldSample(this.config.sampleRate)) {
      return;
    }

    this.queue.enqueue(this._attachConnectionType(base));
  }

  /**
   * Queue a `page_view` event for the given route, including First
   * Contentful Paint timing when available.
   *
   * When `path` is omitted the current `window.location.pathname` is used.
   * Marks the start of the time-on-page interval.
   */
  trackPageView(path?: string): void {
    this.pageStartMs = Date.now();
    this.track(buildPageViewEvent(path ?? currentPath(), { title: documentTitle() }));
  }

  /**
   * Queue a `search` event recording a transaction or account lookup.
   *
   * @param type - The resource type that was looked up, e.g. "tx" or "account".
   * @param identifier - The transaction hash or account address that was looked up.
   * @param responseTimeMs - Optional duration of the corresponding API call.
   */
  trackSearch(type: string, identifier: string, responseTimeMs?: number): void {
    this.track(buildSearchEvent(type, identifier, responseTimeMs));
  }

  /**
   * Queue a `time_on_page` event recording how long the user spent on the
   * page, in seconds.
   *
   * @param seconds - The elapsed time on the page, in seconds.
   */
  trackTimeOnPage(seconds: number): void {
    this.track(buildTimeOnPageEvent(seconds));
  }

  /**
   * Queue a `scroll_depth` event recording that the user reached the given
   * scroll milestone on a result page.
   *
   * @param percent - One of 25, 50, 75, or 100 (percent of page scrolled).
   */
  trackScrollDepth(percent: number): void {
    this.track(buildScrollDepthEvent(percent));
  }

  /**
   * Immediately flush all queued events without waiting for the next
   * automatic flush.
   */
  async flush(): Promise<void> {
    await this.queue.flush();
  }

  /**
   * Number of events currently waiting to be flushed.
   */
  queueSize(): number {
    return this.queue.size();
  }

  /**
   * Cancel the internal flush timer. Call this during teardown to prevent
   * timer leaks (especially important in tests and SSR environments).
   */
  destroy(): void {
    this.queue.destroy();
    if (typeof window === "undefined") return;

    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
    }
    if (this.timeOnPageHandler) {
      window.removeEventListener("pagehide", this.timeOnPageHandler);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Attaches the current connection type (e.g. "4g", "wifi") to
   * `event.properties.connectionType` when the Network Information API is
   * available. Events are returned unchanged when it isn't (Node/SSR, or
   * an unsupporting browser), so no `connectionType: undefined` key is ever
   * added to the payload.
   */
  private _attachConnectionType(event: AnalyticsEvent): AnalyticsEvent {
    const connectionType = getConnectionType();
    if (connectionType === undefined) return event;

    return {
      ...event,
      properties: {
        ...event.properties,
        connectionType,
      },
    };
  }

  /**
   * Registers a scroll listener that emits `scroll_depth` milestones as the
   * user scrolls a result page. Returns `undefined` when the tracking flag is
   * off, an endpoint-free test environment is detected, or scroll tracking is
   * not supported.
   */
  private _bindScrollDepthTracking(): (() => void) | undefined {
    if (this.config.trackScrollDepth === false) return undefined;
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    let ticking = false;
    const handler = (): void => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        this._recordScrollMilestones();
        ticking = false;
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    return handler;
  }

  /**
   * Computes the current scroll depth and fires one `scroll_depth` event for
   * each milestone (25/50/75/100%) reached for the first time.
   */
  private _recordScrollMilestones(): void {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const documentHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (documentHeight <= 0) return;

    const progress = Math.min(1, window.scrollY / documentHeight);
    const percent = Math.round(progress * 100);

    for (const milestone of SCROLL_DEPTH_MILESTONES) {
      if (percent >= milestone && !this.reportedScrollDepths.has(milestone)) {
        this.reportedScrollDepths.add(milestone);
        this.trackScrollDepth(milestone);
      }
    }
  }

  /**
   * Registers a `pagehide` listener that records the time spent on the page
   * since the last `trackPageView` call. Returns `undefined` when tracking is
   * disabled or not in a browser environment.
   */
  private _bindTimeOnPageTracking(): (() => void) | undefined {
    if (this.config.trackTimeOnPage === false) return undefined;
    if (typeof window === "undefined") return undefined;

    const handler = (): void => this._recordTimeOnPage();
    window.addEventListener("pagehide", handler);
    return handler;
  }

  private _recordTimeOnPage(): void {
    if (this.pageStartMs === null) return;

    const seconds = Math.round((Date.now() - this.pageStartMs) / 1000);
    this.pageStartMs = null;

    if (seconds > 0) {
      this.trackTimeOnPage(seconds);
    }
  }

  /**
   * Resolves the client's opt-out state once, at construction time.
   *
   * - A `stellar-explain-analytics-optout` localStorage flag disables
   *   tracking silently.
   * - A `navigator.doNotTrack === "1"` signal disables tracking and, when
   *   `config.debug` is set, logs a message explaining why.
   * - `config.ignoreDnt` skips the Do Not Track check (the localStorage
   *   flag is still honored).
   */
  private _checkOptOut(): boolean {
    if (isOptedOutViaLocalStorage()) return true;

    if (!this.config.ignoreDnt && isOptedOutViaDoNotTrack()) {
      if (this.config.debug) {
        console.debug("[analytics] tracking disabled — Do Not Track is enabled");
      }
      return true;
    }

    return false;
  }

  private _buildFlushCallback(): FlushCallback {
    // Explicit override takes priority
    if (this.config.onFlush) {
      return this.config.onFlush;
    }

    // HTTP sink
    if (this.config.endpoint) {
      const url = this.config.endpoint;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.config.headers,
      };
      const fetchImpl = this.config.fetchImpl ?? fetch;

      return async (batch) => {
        const response = await fetchImpl(url, {
          method: "POST",
          headers,
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          throw new Error(
            `[analytics] batch POST failed: ${response.status} ${response.statusText}`,
          );
        }
      };
    }

    // No-op fallback — useful during development / when no endpoint is set
    return (batch) => {
      if (batch.length > 0) {
        console.debug(`[analytics] no-op flush — ${batch.length} event(s) discarded`);
      }
    };
  }
}

/** Returns the current URL path, defaulting to "/" outside the browser. */
function currentPath(): string {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return "/";
  }
  return window.location.pathname;
}

/** Returns the document title, or `undefined` outside the browser. */
function documentTitle(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.title;
}
