import { warnInsecureUrl } from '../config/validate.js';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    warnInsecureUrl(this.baseUrl);
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Request timed out after ${this.timeoutMs / 1000}s. Check your connection or try --timeout to increase the limit.`
        );
      }
      if (err instanceof TypeError) {
        const msg = String(err.message);
        if (msg.includes('ECONNREFUSED')) {
          throw new Error(`Connection refused at ${this.baseUrl}. Is the Stellar Explain backend running?`);
        }
        if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
          throw new Error(`Cannot reach ${this.baseUrl}. Check the URL and your internet connection.`);
        }
      }
      throw err;
    }
    clearTimeout(timer);

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(
        `API error: ${response.status} ${response.statusText} — ${bodyText.slice(0, 200)}`
      );
    }

    const raw = await response.text();
    let parsed: ApiResponse<T>;
    try {
      parsed = JSON.parse(raw) as ApiResponse<T>;
    } catch {
      throw new Error(
        `Unexpected response from API at ${url}. Expected JSON but received:\n${raw.slice(0, 300)}`
      );
    }
    return parsed.data;
  }

  async health(): Promise<{ status: string; horizon_reachable: boolean; version: string }> {
    return this.get('/health');
  }

  async explainTx(hash: string): Promise<unknown> {
    return this.get(`/tx/${hash}`);
  }

  async explainAccount(address: string): Promise<unknown> {
    return this.get(`/account/${address}`);
  }
}
