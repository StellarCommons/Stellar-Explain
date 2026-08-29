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

// Typed event shapes (PageViewEvent, SearchEvent, etc.)
export type {
  PageViewEvent,
  PageViewProperties,
  SearchEvent,
  SearchProperties,
  ResultViewEvent,
  ResultViewProperties,
  ErrorEvent,
  ErrorProperties,
  CopyEvent,
  CopyProperties,
  StellarAnalyticsEvent,
} from "./types";

// AnalyticsClient — high-level batching client
export { AnalyticsClient } from "./client";
export type { AnalyticsClientConfig } from "./client";

// EventQueue — in-memory queue with 20-event / 30 s auto-flush
export { EventQueue, QUEUE_MAX_SIZE, QUEUE_FLUSH_INTERVAL_MS } from "./queue";
export type { FlushCallback } from "./queue";
