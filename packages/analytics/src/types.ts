/**
 * Typed event shapes for the Stellar Explain analytics pipeline.
 *
 * Each event extends the base AnalyticsEvent interface defined in
 * src/types/events.ts and narrows the `name` discriminant and `properties`
 * to a concrete payload shape.
 */

// ---------------------------------------------------------------------------
// PageViewEvent
// ---------------------------------------------------------------------------

export interface PageViewProperties {
  /** URL path that was viewed, e.g. "/tx/abc123" */
  path: string;
  /** Optional document title */
  title?: string;
  /** Referring URL, if available */
  referrer?: string;
  /** First Contentful Paint timing in milliseconds, if recorded */
  firstContentfulPaintMs?: number;
  /**
   * The user's preferred color scheme ("light"/"dark"), attached only to
   * the first page view of a session.
   */
  colorScheme?: "light" | "dark";
}

export interface PageViewEvent {
  id: string;
  name: "page_view";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: PageViewProperties;
}

// ---------------------------------------------------------------------------
// SearchEvent
// ---------------------------------------------------------------------------

export interface SearchProperties {
  /** The type of resource that was looked up, e.g. "tx" or "account" */
  type: string;
  /** The transaction hash or account address that was looked up */
  identifier: string;
  /** Number of results returned, if known */
  resultCount?: number;
  /** Where the search originated, e.g. "header", "landing" */
  source?: string;
  /** The raw query string the user typed, when applicable */
  query?: string;
  /** API call duration in milliseconds */
  responseTimeMs?: number;
}

export interface SearchEvent {
  id: string;
  name: "search";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: SearchProperties;
}

// ---------------------------------------------------------------------------
// ResultViewEvent
// ---------------------------------------------------------------------------

export interface ResultViewProperties {
  /** The Stellar transaction hash or account address that was viewed */
  resourceId: string;
  /** "tx" | "account" */
  resourceType: "tx" | "account";
  /** Path of the result page */
  path?: string;
}

export interface ResultViewEvent {
  id: string;
  name: "page_view";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ResultViewProperties;
}

// ---------------------------------------------------------------------------
// ResultViewTrackEvent
// ---------------------------------------------------------------------------

export interface ResultViewTrackProperties {
  /** "tx" | "account" — the kind of result page that was rendered */
  type: "tx" | "account";
  /** Whether the result page rendered successfully */
  success: boolean;
  [key: string]: unknown;
}

export interface ResultViewTrackEvent {
  id: string;
  name: "result_view";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ResultViewTrackProperties;
}

// ---------------------------------------------------------------------------
// ErrorEvent
// ---------------------------------------------------------------------------

export interface ErrorProperties {
  /** Machine-readable error code, e.g. "TX_NOT_FOUND" */
  code: string;
  /** Human-readable error message (no PII) */
  message?: string;
  /** The path where the error occurred */
  path?: string;
}

export interface ErrorEvent {
  id: string;
  name: "error_occurred";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ErrorProperties;
}

// ---------------------------------------------------------------------------
// CopyEvent
// ---------------------------------------------------------------------------

export interface CopyProperties {
  /** What was copied, e.g. "tx_hash", "account_address", "explanation" */
  field: string;
  /** Truncated or anonymised preview of what was copied (no PII) */
  preview?: string;
  /** Page path where the copy action happened */
  path?: string;
}

export interface CopyEvent {
  id: string;
  name: "button_click";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: CopyProperties;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

/** All typed analytics event shapes produced by Stellar Explain. */
export type StellarAnalyticsEvent =
  | PageViewEvent
  | SearchEvent
  | ResultViewEvent
  | ErrorEvent
  | CopyEvent;
