import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';

export interface HttpSinkOptions {
  endpoint: string;
  apiKey?: string;
  maxRetries?: number;  // default 3
  baseDelayMs?: number; // default 200ms
}

export class HttpSink implements Emitter {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly deadLetters: AnalyticsEvent[] = [];

  constructor(options: HttpSinkOptions) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 200;
  }

  async send(event: AnalyticsEvent): Promise<void> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify([event]),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return;
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) {
          this.deadLetters.push(event);
          return;
        }
        // exponential backoff: baseDelay * 2^(attempt-1)
        await new Promise(r => setTimeout(r, this.baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  getDeadLetters(): AnalyticsEvent[] {
    return [...this.deadLetters];
  }

  clearDeadLetters(): void {
    this.deadLetters.splice(0, this.deadLetters.length);
  }
}
