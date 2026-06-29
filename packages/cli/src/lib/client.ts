import { NetworkError, NotFoundError, NonJsonResponseError, ConnectionRefusedError } from "./errors.js";
import type {
  TransactionExplanation,
  AccountExplanation,
  HealthResponse,
} from "../types/index.js";

export interface ClientOptions {
  baseUrl: string;
  timeout: number;  // #276
  verbose: boolean; // #277
  retries: number; // #414
}

async function requestOnce<T>(
  url: string,
  opts: ClientOptions,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout);
  const start = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal });
    const duration = Date.now() - start;

    if (opts.verbose) {
      process.stderr.write(`[verbose] ${url} ${res.status} ${duration}ms\n`);
    }

    if (res.status === 404) throw new NotFoundError(`Not found: ${url}`);
    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new NonJsonResponseError(res.status, text.slice(0, 120));
      }
      throw new NetworkError(`HTTP ${res.status}: ${url}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      throw new NonJsonResponseError(res.status, text.slice(0, 120));
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof NetworkError || err instanceof NonJsonResponseError) throw err;
    if ((err as Error).name === "AbortError")
      throw new NetworkError(`Request timed out after ${opts.timeout}ms`);
    // Detect ECONNREFUSED from the underlying fetch error cause
    const cause = (err as { cause?: { message?: string } }).cause;
    if (cause?.message?.includes("ECONNREFUSED"))
      throw new ConnectionRefusedError(url);
    throw new NetworkError(`Request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(url: string, opts: ClientOptions): Promise<T> {
  const retries = Number.isFinite(opts.retries) && opts.retries >= 0 ? opts.retries : 0;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestOnce<T>(url, opts);
    } catch (err) {
      lastError = err;
      // Only retry transient network failures.
      if (!(err instanceof NetworkError) || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

export function createClient(opts: ClientOptions) {
  return {
    getTransaction: (hash: string) =>
      request<TransactionExplanation>(`${opts.baseUrl}/tx/${hash}`, opts),
    getAccount: (address: string) =>
      request<AccountExplanation>(`${opts.baseUrl}/account/${address}`, opts),
    getHealth: () =>
      request<HealthResponse>(`${opts.baseUrl}/health`, opts),
  };
}
