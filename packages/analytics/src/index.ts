// Core event interface and EventName enum (from types/ directory)
export { AnalyticsEvent, EventName } from "./types/events";
export { EventEmitter } from "./emitter";
export type { EventHandler } from "./emitter";
export { HttpSink, ConsoleSink } from "./sinks";
export type { HttpSinkOptions, FetchImpl } from "./sinks";
export { limitPayload } from "./limitPayload";
export { getConnectionInfo, getConnectionType } from "./network";
export type { ConnectionInfo } from "./network";
export {
  OPT_OUT_STORAGE_KEY,
  isOptedOut,
  isOptedOutViaLocalStorage,
  isOptedOutViaDoNotTrack,
} from "./optout";
export { shouldSample } from "./sampling";
export { EventDeduplicator, DEDUP_WINDOW_MS } from "./dedup";
export { getFirstContentfulPaintMs } from "./performance";

// Event builders (Analytics #21-#24)
export { buildTimeOnPageEvent } from "./events/time-on-page";
export type { TimeOnPageEvent, TimeOnPageProperties } from "./events/time-on-page";
export { buildScrollDepthEvent, SCROLL_DEPTH_MILESTONES } from "./events/scroll-depth";
export type { ScrollDepthEvent, ScrollDepthProperties } from "./events/scroll-depth";
export { buildPageViewEvent } from "./events/page-view";
export type { BuildPageViewOptions } from "./events/page-view";
export { buildSearchEvent } from "./events/search";
export { getDeviceType } from "./device";
export type { DeviceType } from "./device";
export { getBrowser } from "./browser";
export { getOS } from "./os";
export { getSessionId, newSessionId, SESSION_ID_STORAGE_KEY } from "./session";
export { getUserId, newUserId, USER_ID_STORAGE_KEY } from "./user";

// Event builders (Analytics #13-#16)
export { buildQRShareEvent } from "./events/qr-share";
export type { QRShareEvent, QRShareProperties } from "./events/qr-share";
export { buildPersonalModeToggleEvent } from "./events/personal-mode";
export type { PersonalModeToggleEvent, PersonalModeToggleProperties } from "./events/personal-mode";
export { buildAddressBookSaveEvent } from "./events/address-book";
export type { AddressBookSaveEvent, AddressBookSaveProperties } from "./events/address-book";
export { buildHistoryOpenEvent } from "./events/history";
export type { HistoryOpenEvent, HistoryOpenProperties } from "./events/history";

// Event builders (Analytics #17-#20)
export { buildHistorySelectEvent } from "./events/history";
export type { HistorySelectEvent, HistorySelectProperties } from "./events/history";
export { buildTabSwitchEvent } from "./events/tab-switch";
export type { TabSwitchEvent, TabSwitchProperties } from "./events/tab-switch";
export { buildBackButtonEvent } from "./events/navigation";
export type { BackButtonEvent, BackButtonProperties } from "./events/navigation";
export { buildRetryEvent } from "./events/retry";
export type { RetryEvent, RetryProperties } from "./events/retry";

// Typed event shapes (PageViewEvent, SearchEvent, etc.)
export type {
  PageViewEvent,
  PageViewProperties,
  SearchEvent,
  SearchProperties,
  ResultViewEvent,
  ResultViewProperties,
  ResultViewTrackEvent,
  ResultViewTrackProperties,
  ErrorEvent,
  ErrorProperties,
  CopyEvent,
  CopyProperties,
  StellarAnalyticsEvent,
} from "./types";

// Event builders (Analytics #9-#12)
export { buildResultViewEvent } from "./events/result-view";
export { buildErrorEvent } from "./events/error";
export { buildCopyEvent } from "./events/copy";
export type { BuildCopyOptions } from "./events/copy";

// AnalyticsClient — high-level batching client
export { AnalyticsClient } from "./client";
export type { AnalyticsClientConfig } from "./client";

// EventQueue — in-memory queue with 20-event / 30 s auto-flush
export { EventQueue, QUEUE_MAX_SIZE, QUEUE_FLUSH_INTERVAL_MS } from "./queue";
export type { FlushCallback } from "./queue";

// Analytics #41 — event schema validation
export { validateEvent, validateOrDrop } from "./validate";
export type { ValidationResult } from "./validate";

// Analytics #44 — custom endpoint support
export { DEFAULT_ANALYTICS_ENDPOINT, resolveEndpoint } from "./config";
