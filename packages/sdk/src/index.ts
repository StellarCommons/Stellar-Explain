export { StellarExplainClient } from "./client/StellarExplainClient.js";

export {
  StellarExplainError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  UpstreamError,
  InvalidInputError,
} from "./errors/index.js";

export { PersistentCache } from "./cache/PersistentCache.js";

// MemoryCache is intentionally NOT exported — internal use only.

export type { CacheAdapter } from "./types/index.js";
export type {
  SdkErrorCode,
  PaymentExplanation,
  TransactionExplanation,
  AssetBalance,
  Signer,
  AccountExplanation,
  HealthResponse,
  StellarExplainClientConfig,
  SdkLogger,
  SdkPlugin,
  FetchImpl,
  RequestOptions,
} from "./types/index.js";
