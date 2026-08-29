import { AnalyticsEvent, EventName } from "./types/events";
import { EventQueue, FlushCallback } from "./queue";
import { StellarAnalyticsEvent } from "./types";
import { getConnectionType } from "./network";
import { isOptedOutViaDoNotTrack, isOptedOutViaLocalStorage } from "./optout";
import { shouldSample } from "./sampling";
import { buildHistorySelectEvent } from "./events/history";
import { buildTabSwitchEvent } from "./events/tab-switch";
import { buildBackButtonEvent } from "./events/navigation";
import { buildRetryEvent } from "./events/retry";
import { getDeviceType } from "./device";
import { getBrowser } from "./browser";
import { getOS } from "./os";
import { buildQRShareEvent } from "./events/qr-share";
import { buildPersonalModeToggleEvent } from "./events/personal-mode";
import { buildAddressBookSaveEvent } from "./events/address-book";
import { buildHistoryOpenEvent } from "./events/history";
import { buildSearchEvent } from "./events/search";
import { buildResultViewEvent } from "./events/result-view";
import { buildErrorEvent } from "./events/error";
import { buildCopyEvent } from "./events/copy";
import { getSessionId } from "./session";
import { getUserId } from "./user";
import { buildPageViewEvent } from "./events/page-view";

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
   * When `true` (default), `track()` is called automatically whenever the
   * browser fires `popstate` or `hashchange` (i.e. the user navigates back/
   * forward or changes the hash). Set to `false` to call `trackPageView`
   * from your own router instead.
   */
  autoTrackPageViews?: boolean;

  /**
   * When `true` (default) and an `endpoint` is configured, any events still
   * queued when the page unloads are flushed via `navigator.sendBeacon`,
   * falling back to a synchronous POST when `sendBeacon` is unavailable.
   */
  flushOnUnload?: boolean;
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

    const base = event as AnalyticsEvent;

    if (!EventName.includes(base.name as EventName)) {
      console.warn(`[analytics] dropped unknown event "${base.name}"`);
      return;
    }

    if (this.config.sampleRate !== undefined && !shouldSample(this.config.sampleRate)) {
      return;
    }

    this.queue.enqueue(this._attachEnvironment(base));
  }

  /**
   * Queue a `page_view` event for the given route, including the referrer
   * (query-safe) when available.
   *
   * When `path` is omitted the current `window.location.pathname` is used.
   */
  trackPageView(path?: string): void {
    this.track(buildPageViewEvent(path ?? currentPath(), { title: documentTitle() }));
    this.queue.enqueue(this._attachIdentity(this._attachConnectionType(base)));
  }

  /**
   * Queue a `page_view` event for the current route.
   *
   * When `path` is omitted the current `window.location.pathname` is used.
   * Call this from your router on every navigation, or rely on the automatic
   * `autoTrackPageViews` binding when the app uses back/forward/hash routing.
   */
  trackPageView(path?: string): void {
    this.track(buildPageViewEvent(path ?? currentPath(), { title: documentTitle() }));
  }

  /**
   * Queue a `search` event recording a transaction or account lookup.
   *
   * @param type - The resource type that was looked up, e.g. "tx" or "account".
   * @param identifier - The transaction hash or account address that was looked up.
   */
  trackSearch(type: string, identifier: string): void {
    this.track(buildSearchEvent(type, identifier));
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

    if (this.onPageHide) window.removeEventListener("pagehide", this.onPageHide);
    if (this.onRouteChange) {
      window.removeEventListener("popstate", this.onRouteChange);
      window.removeEventListener("hashchange", this.onRouteChange);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Attaches environment context to an event: connection type, device type,
   * browser, and OS. Each is only included when its detection API is
   * available, so unsupported environments (Node/SSR, or an unsupporting
   * browser) never produce `undefined` keys in the payload, and events are
   * returned unchanged when nothing could be detected.
   */
  private _attachEnvironment(event: AnalyticsEvent): AnalyticsEvent {
    const connectionType = getConnectionType();
    const deviceType = getDeviceType();
    const browser = getBrowser();
    const os = getOS();

    if (
      connectionType === undefined &&
      deviceType === undefined &&
      browser === undefined &&
      os === undefined
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
      },
    };
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
    // doesn't drop the request while tearing down the page.
    try {
      const request = new XMLHttpRequest();
      request.open("POST", endpoint, false);
      request.setRequestHeader("Content-Type", headers["Content-Type"]);
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
