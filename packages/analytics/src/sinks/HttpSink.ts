import { AnalyticsEvent } from "../types/events";

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

export interface HttpSinkOptions {
  url: string;
  headers?: Record<string, string>;
  /** Injectable fetch — defaults to global `fetch`. */
  fetchImpl?: FetchImpl;
}

/**
 * Sends each analytics event as a JSON POST to the configured URL.
 *
 * Throws an error if the server responds with a non-2xx status code so that
 * callers (e.g. EventEmitter handlers) can handle failures explicitly.
 */
export class HttpSink {
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: FetchImpl;

  constructor(options: HttpSinkOptions) {
    this.url = options.url;
    this.headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(event: AnalyticsEvent): Promise<void> {
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(
        `HttpSink: server responded with ${response.status} ${response.statusText}`,
      );
    }
  }
}
