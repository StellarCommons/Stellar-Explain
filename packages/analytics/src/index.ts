// Core event interface and EventName enum (from types/ directory)
export { AnalyticsEvent, EventName } from "./types/events";
export { EventEmitter, NoopEmitter } from "./emitter";
export type { EventHandler, EventEmitterMetrics, EventEmitterOptions } from "./emitter";

// Analytics #95, #97, #98 — structured logging, circuit breaker
export { ConsoleLogger, defaultLogger } from "./lib/logger";
export type { Logger, LogLevel, LogRecord, ConsoleLoggerOptions } from "./lib/logger";
export { CircuitBreaker } from "./lib/circuitBreaker";
export type { CircuitState, CircuitBreakerOptions } from "./lib/circuitBreaker";
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
export { getUserId, newUserId, USER_ID_STORAGE_KEY, attachUserProperties } from "./user";

// Analytics #86 — group() context for organisation-level tracking
export { attachGroupContext } from "./group";
export type { GroupContext } from "./group";

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

// Event builders — experiment / external-link / heatmap
export { buildExperimentAssignEvent } from "./events/experiment";
export type { ExperimentAssignEvent, ExperimentAssignProperties } from "./events/experiment";
export { buildExternalLinkClickEvent, isExternalLink } from "./events/external-link";
export type { ExternalLinkClickEvent, ExternalLinkClickProperties } from "./events/external-link";
export { buildHeatmapClickEvent, normaliseClick } from "./events/heatmap";
export type { HeatmapClickEvent, HeatmapClickProperties } from "./events/heatmap";

// Event builders — dead-click, visibility, focus/blur
export { buildDeadClickEvent } from "./events/dead-click";
export type { DeadClickEvent, DeadClickProperties } from "./events/dead-click";
export { buildVisibilityChangeEvent } from "./events/visibility";
export type { VisibilityChangeEvent, VisibilityChangeProperties } from "./events/visibility";
export { buildWindowFocusEvent, buildWindowBlurEvent } from "./events/focus";
export type { WindowFocusEvent, WindowFocusProperties, WindowBlurEvent, WindowBlurProperties } from "./events/focus";

// Web Vitals tracking
export { buildWebVitalEvent, startVitalsTracking } from "./vitals";
export type { WebVitalEvent, WebVitalProperties } from "./vitals";

// Event builders — click, form submit, funnel
export { buildClickEvent } from "./events/click";
export type { ClickEvent, ClickProperties } from "./events/click";
export { buildFormSubmitEvent } from "./events/form";
export type { FormSubmitEvent, FormSubmitProperties } from "./events/form";
export { buildFunnelStepEvent } from "./events/funnel";
export type { FunnelStepEvent, FunnelStepProperties } from "./events/funnel";

// Event middleware
export { runMiddleware } from "./middleware";
export type { EventMiddleware } from "./middleware";

// AnalyticsClient — high-level batching client
export { AnalyticsClient } from "./client";
export type { AnalyticsClientConfig } from "./client";

// EventQueue — in-memory queue with 20-event / 30 s auto-flush
export { EventQueue, QUEUE_MAX_SIZE, QUEUE_FLUSH_INTERVAL_MS } from "./queue";
export type { FlushCallback, EventQueueOptions } from "./queue";

// Analytics #41 — event schema validation
export { validateEvent, validateOrDrop } from "./validate";
export type { ValidationResult } from "./validate";

// Analytics #44 — custom endpoint support
export { DEFAULT_ANALYTICS_ENDPOINT, resolveEndpoint } from "./config";

// Analytics #47 — plugin system
export { runBeforeTrack, runAfterTrack } from "./plugins";
export type { AnalyticsPlugin } from "./plugins";
