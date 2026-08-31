export const EventName = [
  "page_view",
  "button_click",
  "form_submit",
  "api_call",
  "error_occurred",
  "login",
  "logout",
  "search",
  "purchase",
  "refund",
  "account.explained",
  "account.not_found",
  "tx.not_found",
  "error.api",
  "search.performed",
  "history_select",
  "tab_switch",
  "back_button",
  "retry",
  "qr_share",
  "personal_mode_toggle",
  "address_book_save",
  "history_open",
  "result_view",
  "time_on_page",
  "scroll_depth",
  "experiment_assign",
  "external_link_click",
  "heatmap_click",
] as const;

export type EventName = (typeof EventName)[number];

export interface AnalyticsEvent {
  id: string;
  name: EventName;
  timestamp: Date;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  /** Organisation/workspace context attached via `AnalyticsClient.group()` (issue #86). */
  groupId?: string;
}
