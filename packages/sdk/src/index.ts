export { StellarExplainClient } from "./client/StellarExplainClient.js";
export { TimeoutError, ApiRequestError, UpstreamError } from "./errors/index.js";
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
