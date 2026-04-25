/**
 * Optional undici-based fetch adapter for Node 16 compatibility.
 *
 * undici is a peer dependency — install it separately:
 *   npm install undici
 *
 * This file is only imported when the consumer explicitly requests it.
 * The default SDK bundle has zero extra dependencies.
 */

// Type-only import so the peer-dep absence never causes a module-load error
// in environments that import from the main entry point.
import type { Pool } from "undici";
import { fetch as undiciFetch, Agent } from "undici";
import type { FetchImpl } from "../types/index.js";

/**
 * Factory that returns a fetch-compatible function backed by undici.
 *
 * When `options` are provided, an `undici.Agent` is created with those pool
 * options and attached as the dispatcher for every request, enabling custom
 * connection-pool tuning (max connections, pipelining, keep-alive, etc.).
 *
 * Emits a console warning when `globalThis.fetch` is already present — in
 * that case the native implementation is sufficient and this adapter is not
 * needed.
 *
 * @example
 * // Basic usage — Node 16, no pool config
 * import { fetch } from 'undici';
 * const client = new StellarExplainClient({ baseUrl: '...', fetchImpl: fetch });
 *
 * @example
 * // With custom pool options
 * import { createUndiciFetch } from '@stellar-explain/sdk/adapters/undiciFetch';
 * const client = new StellarExplainClient({
 *   baseUrl: '...',
 *   fetchImpl: createUndiciFetch({ connections: 10 }),
 * });
 */
export function createUndiciFetch(options?: Pool.Options): FetchImpl {
  if (typeof globalThis.fetch !== "undefined") {
    console.warn(
      "[stellar-explain/sdk] globalThis.fetch is already available in this " +
        "environment — you do not need the undici adapter. " +
        "Pass fetchImpl only on Node 16 or when custom pool configuration is required."
    );
  }

  if (!options) {
    // Undici's fetch is API-compatible with the WHATWG Fetch standard.
    return undiciFetch as unknown as FetchImpl;
  }

  // An undici Agent manages one Pool per origin and accepts the same
  // connection-level options as Pool, so we can forward options directly.
  const agent = new Agent(options as ConstructorParameters<typeof Agent>[0]);

  return (input, init) =>
    undiciFetch(input, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: agent,
    }) as unknown as Promise<Response>;
}
