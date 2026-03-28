export { StellarExplainClient } from "./client/StellarExplainClient.js";
export { TimeoutError, ApiRequestError } from "./errors/index.js";
export { MemoryCache } from "./cache/MemoryCache.js";
export { PersistentCache } from "./cache/PersistentCache.js";
export type { CacheAdapter } from "./cache/CacheAdapter.js";
export type {
  TransactionExplanation,
  AccountExplanation,
  PaymentExplanation,
  HealthResponse,
  ApiError,
  FetchImpl,
  RequestOptions,
  StellarExplainClientOptions,
} from "./types/index.js";

// Adapter is intentionally NOT re-exported from the main entry point.
// Import it directly when needed:
//   import { createUndiciFetch } from '@stellar-explain/sdk/adapters/undiciFetch'
