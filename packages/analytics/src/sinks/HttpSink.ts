import type { Emitter } from '../emitter/index.js';
import type { AnalyticsEvent } from '../types.js';

export interface HttpSinkOptions {
  endpoint: string;
  apiKey?: string;
  maxRetries?: number;
  baseDelayMs?: number;
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        });
        if (res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
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

    this.deadLetters.push(event);
    throw lastError;
  }

  getDeadLetters(): AnalyticsEvent[] {
    return [...this.deadLetters];
  }

  clearDeadLetters(): void {
    this.deadLetters.length = 0;
    this.deadLetters.splice(0, this.deadLetters.length);
  }
}
