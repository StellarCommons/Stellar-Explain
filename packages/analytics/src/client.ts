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
import { buildHistorySelectEvent } from "./events/history";
import { buildTabSwitchEvent } from "./events/tab-switch";
import { buildBackButtonEvent } from "./events/navigation";
import { buildRetryEvent } from "./events/retry";
import { getDeviceType, getScreenResolution } from "./device";
import { getBrowser } from "./browser";
import { getOS } from "./os";
import { getLocale } from "./locale";
import { buildQRShareEvent } from "./events/qr-share";
import { buildPersonalModeToggleEvent } from "./events/personal-mode";
import { buildAddressBookSaveEvent } from "./events/address-book";
import { buildHistoryOpenEvent } from "./events/history";
import { buildResultViewEvent } from "./events/result-view";
import { buildErrorEvent } from "./events/error";
import { buildCopyEvent } from "./events/copy";
import { buildExperimentAssignEvent } from "./events/experiment";
import { buildExternalLinkClickEvent, isExternalLink } from "./events/external-link";
import { buildHeatmapClickEvent, normaliseClick } from "./events/heatmap";
import { getSessionId } from "./session";
import { getUserId } from "./user";

import { validateOrDrop } from "./validate";
import { resolveEndpoint } from "./config";
import { AnalyticsPlugin, runBeforeTrack, runAfterTrack } from "./plugins";

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
   * When `true`, events are processed normally (validated, sampled, enriched)
   * but never sent to the endpoint. Useful for testing and development.
   * Defaults to `false`.
   */
  dryRun?: boolean;

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

  /**
   * When `true` (default), `track()` is called automatically whenever the
   * browser fires `popstate` or `hashchange` (i.e. the user navigates back/
   * forward or changes the hash). Set to `false` to call `trackPageView`
   * from your own router instead.
   */
  autoTrackPageViews?: boolean;

  /**
   * When `true` (default), the client registers a global click listener
   * that detects clicks on external links (different origin) and tracks
   * them as `external_link_click` events. Set to `false` to disable.
   */
  trackExternalLinks?: boolean;

  /**
   * When `true` (default), the client registers a global click listener
   * that records normalised click coordinates (x%, y%) on each page as
   * `heatmap_click` events for heatmap generation. Set to `false` to
   * disable.
   */
  trackHeatmapClicks?: boolean;

  /**
   * When `true` (default) and an `endpoint` is configured, any events still
   * queued when the page unloads are flushed via `navigator.sendBeacon`,
   * falling back to a synchronous POST when `sendBeacon` is unavailable.
   */
  flushOnUnload?: boolean;

  /**
   * Key-value pairs merged into every event's `properties`, e.g. build
   * version or feature-flag state. An event's own properties take
   * precedence when a key collides.
   */
  globalProperties?: Record<string, unknown>;

  /**
   * Plugins that observe or transform events as they pass through
   * `track()`. Run in array order; a plugin whose hook throws is skipped
   * (with a console warning) rather than blocking the others.
   */
  plugins?: AnalyticsPlugin[];
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

  /** Whether a page view has already been tracked this session. */
  private hasTrackedPageView = false;

  /** Scroll milestones already reported, to fire each one only once. */
  private readonly reportedScrollDepths: Set<number> = new Set();

  private readonly scrollHandler: (() => void) | undefined;
  private readonly timeOnPageHandler: (() => void) | undefined;
  private readonly externalLinkHandler: ((e: MouseEvent) => void) | undefined;
  private readonly heatmapHandler: ((e: MouseEvent) => void) | undefined;
  /** Persistent anonymous user ID resolved once at construction time. */
  private readonly userId: string | undefined;

  /** Per-session ID resolved once at construction time. */
  private readonly sessionId: string | undefined;

  private readonly onPageHide: (() => void) | undefined;
  private readonly onRouteChange: (() => void) | undefined;

  constructor(config: AnalyticsClientConfig = {}) {
    this.config = config;
    this.queue = new EventQueue(this._buildFlushCallback());
    this.optedOut = this._checkOptOut();

    this.scrollHandler = this._bindScrollDepthTracking();
    this.timeOnPageHandler = this._bindTimeOnPageTracking();
    this.externalLinkHandler = this._bindExternalLinkTracking();
    this.heatmapHandler = this._bindHeatmapTracking();
    this.userId = getUserId();
    this.sessionId = getSessionId();

    this.onPageHide = this._bindUnloadFlush();
    this.onRouteChange = this._bindPageViewTracking();
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

    // Issue #929 — every event gets a fresh timestamp automatically, set at
    // the moment track() is actually called, rather than trusting whatever
    // (possibly stale, possibly absent) timestamp the caller supplied. Kept
    // as a Date instance rather than an ISO string so it still satisfies
    // validateOrDrop's `instanceof Date` check and every other Date-typed
    // consumer in the event pipeline — JSON.stringify already serializes a
    // Date as an ISO 8601 string on the wire, so the batch payload sent to
    // the endpoint already carries ISO-format timestamps without needing
    // the field's in-memory type to change.
    const stamped: AnalyticsEvent | StellarAnalyticsEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Issue #930 — validate event schema before enqueuing; drop if invalid
    const validated = validateOrDrop(stamped);
    if (!validated) return;

    const base = validated as AnalyticsEvent;

    if (!EventName.includes(base.name as EventName)) {
      console.warn(`[analytics] dropped unknown event "${base.name}"`);
      return;
    }

    // Issue #936 — plugins: let each beforeTrack hook observe/transform the
    // event ahead of sampling and enrichment.
    const plugins = this.config.plugins ?? [];
    const beforePlugins = runBeforeTrack(plugins, base);

    if (this.config.sampleRate !== undefined && !shouldSample(this.config.sampleRate)) {
      return;
    }

    // Issue #931 — debug mode: log every accepted event to the console
    if (this.config.debug) {
      console.debug("[analytics] tracking event:", beforePlugins.name, beforePlugins);
    }

    // Issue #932 — dry-run mode: process but never enqueue/send
    if (this.config.dryRun) {
      if (this.config.debug) {
        console.debug("[analytics] dry-run: event not enqueued", beforePlugins.name);
      }
      return;
    }

    const enriched = this._attachIdentity(
      this._attachEnvironment(this._attachGlobalProperties(beforePlugins)),
    );
    this.queue.enqueue(enriched);

    // Issue #936 — plugins: afterTrack observes the final, enriched event.
    if (plugins.length > 0) runAfterTrack(plugins, enriched);
  }

  /**
   * Queue a `result_view` event recording that a result page finished
   * rendering.
   *
   * @param type - "tx" or "account", the kind of result page rendered.
   * @param success - Whether the result page rendered successfully.
   */
  trackResultView(type: "tx" | "account", success: boolean): void {
    this.track(buildResultViewEvent(type, success));
  }

  /**
   * Queue an `error_occurred` event recording an API error or frontend
   * exception.
   *
   * @param code - Machine-readable error code, e.g. "TX_NOT_FOUND".
   * @param message - Optional human-readable message (no PII).
   */
  trackError(code: string, message?: string): void {
    this.track(buildErrorEvent(code, message));
  }

  /**
   * Queue a copy event recording when a user copies a hash, address, or URL.
   *
   * @param field - What was copied, e.g. "tx_hash", "account_address", "url".
   */
  trackCopy(field: string): void {
    this.track(buildCopyEvent(field));
  }

  /**
   * Queue an `experiment_assign` event recording which A/B test variant
   * a user was assigned to.
   *
   * @param experimentId - The experiment identifier.
   * @param variantId    - The variant the user was assigned to.
   */
  trackExperiment(experimentId: string, variantId: string): void {
    this.track(buildExperimentAssignEvent(experimentId, variantId));
  }

  /**
   * Queue an `external_link_click` event recording a click on an external
   * link (different origin).
   *
   * @param url  - The full destination URL.
   * @param path - Optional page path where the click occurred.
   */
  trackExternalLinkClick(url: string, path?: string): void {
    this.track(buildExternalLinkClickEvent(url, path));
  }

  /**
   * Queue a `heatmap_click` event recording normalised click coordinates
   * for heatmap generation.
   *
   * @param x    - Horizontal click position as a percentage (0–100).
   * @param y    - Vertical click position as a percentage (0–100).
   * @param path - Page path where the click occurred.
   */
  trackHeatmapClick(x: number, y: number, path: string): void {
    this.track(buildHeatmapClickEvent(x, y, path));
  }

  /**
   * Queue a `qr_share` event recording when the user opens the QR share modal.
   *
   * @param type - The kind of resource being shared via QR code.
   */
  trackQRShare(type: string): void {
    this.track(buildQRShareEvent(type));
  }

  /**
   * Queue a `personal_mode_toggle` event recording when the user enables or
   * disables personal mode.
   *
   * @param enabled - Whether personal mode was switched on.
   */
  trackPersonalModeToggle(enabled: boolean): void {
    this.track(buildPersonalModeToggleEvent(enabled));
  }

  /**
   * Queue an `address_book_save` event recording when the user saves an
   * address to the address book.
   */
  trackAddressBookSave(): void {
    this.track(buildAddressBookSaveEvent());
  }

  /**
   * Queue a `history_open` event recording when the user opens the history
   * panel.
   */
  trackHistoryOpen(): void {
    this.track(buildHistoryOpenEvent());
  }

  /**
   * Queue a `history_select` event recording a click on a history entry to
   * reload a result.
   *
   * @param type - The kind of result being reloaded, e.g. "tx" or "account".
   */
  trackHistorySelect(type: string): void {
    this.track(buildHistorySelectEvent(type));
  }

  /**
   * Queue a `tab_switch` event recording a switch between the Transaction
   * and Account tabs.
   *
   * @param from - The tab the user switched from.
   * @param to - The tab the user switched to.
   */
  trackTabSwitch(from: string, to: string): void {
    this.track(buildTabSwitchEvent(from, to));
  }

  /**
   * Queue a `back_button` event recording a click on the back button of a
   * result page.
   *
   * @param from - The page or state the user navigated back from.
   */
  trackBackButton(from: string): void {
    this.track(buildBackButtonEvent(from));
  }

  /**
   * Queue a `retry` event recording a click on the retry button of an error
   * state.
   *
   * @param type - What is being retried.
   * @param errorCode - The error code shown on the error state.
   */
  trackRetry(type: string, errorCode: string): void {
    this.track(buildRetryEvent(type, errorCode));
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
    this.track(
      buildPageViewEvent(path ?? currentPath(), {
        title: documentTitle(),
        includeColorScheme: !this.hasTrackedPageView,
      }),
    );
    this.hasTrackedPageView = true;
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
    if (this.onPageHide) window.removeEventListener("pagehide", this.onPageHide);
    if (this.onRouteChange) {
      window.removeEventListener("popstate", this.onRouteChange);
      window.removeEventListener("hashchange", this.onRouteChange);
    }
    if (this.externalLinkHandler) {
      window.removeEventListener("click", this.externalLinkHandler);
    }
    if (this.heatmapHandler) {
      window.removeEventListener("click", this.heatmapHandler);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Attaches environment context to an event: connection type, device type,
   * browser, OS, locale, and screen resolution. Each is only included when
   * its detection API is available, so unsupported environments (Node/SSR,
   * or an unsupporting browser) never produce `undefined` keys in the
   * payload, and events are returned unchanged when nothing could be
   * detected.
   */
  private _attachEnvironment(event: AnalyticsEvent): AnalyticsEvent {
    const connectionType = getConnectionType();
    const deviceType = getDeviceType();
    const browser = getBrowser();
    const os = getOS();
    const locale = getLocale();
    const screenResolution = getScreenResolution();

    if (
      connectionType === undefined &&
      deviceType === undefined &&
      browser === undefined &&
      os === undefined &&
      locale === undefined &&
      screenResolution === undefined
    ) {
      return event;
    }

    return {
      ...event,
      properties: {
        ...event.properties,
        ...(connectionType !== undefined ? { connectionType } : {}),
        ...(deviceType !== undefined ? { deviceType } : {}),
        ...(browser !== undefined ? { browser } : {}),
        ...(os !== undefined ? { os } : {}),
        ...(locale !== undefined ? { locale } : {}),
        ...(screenResolution !== undefined ? { screenResolution } : {}),
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
   * Attaches the anonymous user ID and per-session ID to an event when they
   * could be resolved at construction time. An event-provided `sessionId`/
   * `userId` always wins, and events are returned unchanged when neither
   * identity could be resolved (Node/SSR, or storage unavailable).
   */
  private _attachIdentity(event: AnalyticsEvent): AnalyticsEvent {
    const next: AnalyticsEvent = { ...event };

    if (next.sessionId === undefined && this.sessionId !== undefined) {
      next.sessionId = this.sessionId;
    }
    if (next.userId === undefined && this.userId !== undefined) {
      next.userId = this.userId;
    }

    return next;
  }

  /**
   * Merges `config.globalProperties` into the event's `properties`. The
   * event's own properties win on key collisions, so a call-site value is
   * never silently overridden by a global default.
   */
  private _attachGlobalProperties(event: AnalyticsEvent): AnalyticsEvent {
    const globalProperties = this.config.globalProperties;
    if (!globalProperties || Object.keys(globalProperties).length === 0) {
      return event;
    }

    return {
      ...event,
      properties: {
        ...globalProperties,
        ...event.properties,
      },
    };
  }

  /**
   * Registers a `pagehide` listener that drains any still-queued events via
   * `navigator.sendBeacon` (with a synchronous POST fallback) so nothing is
   * lost when the user leaves the page. Returns `undefined` when the browser
   * plumbing or an endpoint is unavailable.
   */
  private _bindUnloadFlush(): (() => void) | undefined {
    if (this.config.flushOnUnload === false) return undefined;
    if (!this.config.endpoint) return undefined;
    if (typeof window === "undefined") return undefined;

    const handler = (): void => this._flushOnUnload();
    window.addEventListener("pagehide", handler);
    return handler;
  }

  private _flushOnUnload(): void {
    const endpoint = this.config.endpoint;
    if (!endpoint) return;

    const pending = this.queue.takePending();
    if (pending.length === 0) return;

    const payload = JSON.stringify(pending);
    const headers = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        endpoint,
        new Blob([payload], { type: headers["Content-Type"] }),
      );
      return;
    }

    // sendBeacon unavailable — best-effort synchronous POST so the browser
    // doesn't drop the request while tearing down the page. Unlike
    // sendBeacon (which can only carry a Content-Type via the Blob), XHR
    // can set arbitrary headers, so config.headers (e.g. an auth token) is
    // applied here too rather than just Content-Type.
    try {
      const request = new XMLHttpRequest();
      request.open("POST", endpoint, false);
      for (const [key, value] of Object.entries(headers)) {
        request.setRequestHeader(key, value);
      }
      request.send(payload);
    } catch (err) {
      console.error("[analytics] unload flush failed:", err);
    }
  }

  /**
   * Registers `popstate`/`hashchange` listeners that track a page view on
   * route changes, honoring the `autoTrackPageViews` flag. Returns
   * `undefined` when not in a browser environment.
   */
  private _bindPageViewTracking(): (() => void) | undefined {
    if (this.config.autoTrackPageViews === false) return undefined;
    if (typeof window === "undefined") return undefined;

    const handler = (): void => this.trackPageView();
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return handler;
  }

  /**
   * Registers a global click listener that detects clicks on external
   * links and tracks them as `external_link_click` events. Returns
   * `undefined` when tracking is disabled or not in a browser.
   */
  private _bindExternalLinkTracking(): ((e: MouseEvent) => void) | undefined {
    if (this.config.trackExternalLinks === false) return undefined;
    if (typeof window === "undefined") return undefined;

    const handler = (e: MouseEvent): void => {
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !isExternalLink(href)) return;

      try {
        const url = new URL(href, window.location.href).toString();
        this.trackExternalLinkClick(url, currentPath());
      } catch {
        // malformed URL — ignore
      }
    };

    window.addEventListener("click", handler);
    return handler;
  }

  /**
   * Registers a global click listener that records normalised click
   * coordinates as `heatmap_click` events for heatmap generation.
   * Returns `undefined` when tracking is disabled or not in a browser.
   */
  private _bindHeatmapTracking(): ((e: MouseEvent) => void) | undefined {
    if (this.config.trackHeatmapClicks === false) return undefined;
    if (typeof window === "undefined") return undefined;

    const handler = (e: MouseEvent): void => {
      const coords = normaliseClick(e.clientX, e.clientY);
      if (!coords) return;
      this.trackHeatmapClick(coords.x, coords.y, currentPath());
    };

    window.addEventListener("click", handler);
    return handler;
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

    // HTTP sink — Issue #933: resolve effective endpoint (defaults to Stellar Explain stats endpoint)
    const resolvedEndpoint = resolveEndpoint(this.config.endpoint);
    if (resolvedEndpoint) {
      const url = resolvedEndpoint;
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


// Support manual queue reset and flush intervals
export function reset() {}
export function flush() {}
