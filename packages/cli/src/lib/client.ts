import { NetworkError, NotFoundError } from "./errors.js";
import type {
  TransactionExplanation,
  AccountExplanation,
  HealthResponse,
} from "./types/index.js";

export interface ClientOptions {
  baseUrl: string;
  timeout: number;
  verbose: boolean;
}

async function request<T>(url: string, opts: ClientOptions): Promise<T> {
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
    if (!res.ok) throw new NetworkError(`HTTP ${res.status}: ${url}`);
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof NetworkError) throw err;
    if ((err as Error).name === "AbortError")
      throw new NetworkError(`Request timed out after ${opts.timeout}ms`);
    throw new NetworkError(`Request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
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
