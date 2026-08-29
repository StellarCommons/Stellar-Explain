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
  "qr_share",
  "personal_mode_toggle",
  "address_book_save",
  "history_open",
] as const;

export type EventName = (typeof EventName)[number];

export interface AnalyticsEvent {
  id: string;
  name: EventName;
  timestamp: Date;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}
