import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';

export interface HttpSinkOptions {
  endpoint: string;
  maxRetries?: number;
}

/** Emitter that POSTs events to an HTTP endpoint with basic retry logic. */
export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly maxRetries: number;
  private readonly deadLetter: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    this.endpoint = options.endpoint;
    this.maxRetries = options.maxRetries ?? 3;
  }

  send(event: AnalyticsEvent): void {
    this.sendWithRetry(event, 0);
  }

  get deadLetterQueue(): readonly AnalyticsEvent[] {
    return this.deadLetter;
  }

  private sendWithRetry(event: AnalyticsEvent, attempt: number): void {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      if (attempt < this.maxRetries) {
        setTimeout(() => this.sendWithRetry(event, attempt + 1), 200 * (attempt + 1));
      } else {
        this.deadLetter.push(event);
      }
    });
  }
}
