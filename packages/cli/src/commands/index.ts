// Wires the global --url flag to all CLI commands so users can target
// a self-hosted Stellar Explain instance.

import { loadConfig, validateUrl, buildUrl } from "../lib/config";

export interface GlobalFlags {
  url?: string;
  json?: boolean;
}

/**
 * Fetches and returns the raw JSON from a Stellar Explain endpoint.
 * Respects the --url flag via the shared config loader.
 */
async function fetchEndpoint(path: string, flags: GlobalFlags): Promise<unknown> {
  const { baseUrl } = loadConfig(flags.url ? validateUrl(flags.url) : undefined);
  const endpoint = buildUrl(baseUrl, path);
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/** Explain a transaction by hash. */
export async function txCommand(hash: string, flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint(`/tx/${hash}`, flags);
  console.log(flags.json ? JSON.stringify(data, null, 2) : (data as any).summary);
}

/** Explain an account by ID. */
export async function accountCommand(id: string, flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint(`/account/${id}`, flags);
  console.log(flags.json ? JSON.stringify(data, null, 2) : (data as any).summary);
}

/** Check service health. */
export async function healthCommand(flags: GlobalFlags): Promise<void> {
  const data = await fetchEndpoint("/health", flags);
  console.log(flags.json ? JSON.stringify(data, null, 2) : (data as any).status);
}
