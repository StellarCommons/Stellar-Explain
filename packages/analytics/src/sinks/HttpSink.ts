import type { AnalyticsEvent } from "../types/events";

export type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

export interface HttpSinkOptions {
  /** Endpoint to POST events to. */
  url: string;
  /** Optional bearer token — sent as `Authorization: Bearer <token>`. */
  token?: string;
  /** Optional additional headers merged into every request. */
  headers?: Record<string, string>;
  /**
   * Fetch implementation to use.  Defaults to the global `fetch`.
   * Override in tests to avoid real network calls.
   */
  fetchImpl?: FetchImpl;
}

/**
 * HttpSink — POSTs each analytics event as JSON to a remote endpoint.
 *
 * Non-2xx responses are treated as errors and re-thrown so the caller
 * can decide whether to retry or suppress.
 */
export class HttpSink {
  private readonly url: string;
  private readonly token?: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly fetch: FetchImpl;

  constructor(options: HttpSinkOptions) {
    this.url = options.url;
    this.token = options.token;
    this.extraHeaders = options.headers ?? {};
    this.fetch = options.fetchImpl ?? (globalThis.fetch as FetchImpl);
  }

  async send(event: AnalyticsEvent): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.extraHeaders,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const body = JSON.stringify({
      id: event.id,
      name: event.name,
      timestamp: event.timestamp.toISOString(),
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      properties: event.properties ?? {},
    });

    const response = await this.fetch(this.url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `HttpSink: received HTTP ${response.status} from ${this.url}`,
      );
    }
  }
}
