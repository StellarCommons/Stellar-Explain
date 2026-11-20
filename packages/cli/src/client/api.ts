import { warnInsecureUrl } from '../config/validate.js';
import { CliError } from '../utils/errors.js';
import { ExitCode } from '../utils/exit.js';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const DEFAULT_TIMEOUT_MS = 30_000;

const TX_HASH_RE = /^[0-9a-f]{64}$/i;
const ACCOUNT_RE = /^G[A-Z2-7]{55}$/;

export function isValidTxHash(hash: string): boolean {
  return TX_HASH_RE.test(hash);
}

export function isValidAccountAddress(address: string): boolean {
  return ACCOUNT_RE.test(address);
}

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
          `Request timed out after ${this.timeoutMs / 1000}s. Check your connection and try again.`
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
    if (!isValidTxHash(hash)) {
      throw new CliError(`Invalid transaction hash: expected 64 hex characters.`, ExitCode.INPUT_ERROR);
    }
    return this.get(`/tx/${encodeURIComponent(hash)}`);
  }

  async explainAccount(address: string): Promise<unknown> {
    if (!isValidAccountAddress(address)) {
      throw new CliError(`Invalid account address: expected a 56-character Stellar address starting with G.`, ExitCode.INPUT_ERROR);
    }
    return this.get(`/account/${encodeURIComponent(address)}`);
  }
}
