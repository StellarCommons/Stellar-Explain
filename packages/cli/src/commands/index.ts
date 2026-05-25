// Wires the global --url flag to all CLI commands so users can target
// a self-hosted Stellar Explain instance.

import { loadConfig, validateUrl, buildUrl } from "../lib/config";

export interface GlobalFlags {
  url?: string;
  json?: boolean;
}

type ApiResponse = Record<string, unknown>;

/**
 * Fetches and returns the raw JSON from a Stellar Explain endpoint.
 * Respects the --url flag via the shared config loader.
 */
async function fetchEndpoint(path: string, flags: GlobalFlags): Promise<ApiResponse> {
  const { baseUrl } = loadConfig(flags.url ? validateUrl(flags.url) : undefined);
  const endpoint = buildUrl(baseUrl, path);
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiResponse;
    throw new Error((body?.error as ApiResponse)?.message as string ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ApiResponse>;
}

/** Explain a transaction by hash. */
export async function txCommand(hash: string, flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint(`/tx/${hash}`, flags);
  // eslint-disable-next-line no-console
  console.log(flags.json ? JSON.stringify(data, null, 2) : data.summary);
}

/** Explain an account by ID. */
export async function accountCommand(id: string, flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint(`/account/${id}`, flags);
  // eslint-disable-next-line no-console
  console.log(flags.json ? JSON.stringify(data, null, 2) : data.summary);
}

/** Check service health. */
export async function healthCommand(flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint("/health", flags);
  // eslint-disable-next-line no-console
  console.log(flags.json ? JSON.stringify(data, null, 2) : data.status);
}
