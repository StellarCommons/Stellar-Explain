// Migration utilities for API response shapes across versions.
//
// As of the Third Campaign track (issues #866–#871), the backend does not
// include a `version` field on any response type. This file previously
// referenced a hypothetical `version` field that never existed in the actual
// Rust responses. It has been corrected to reflect the current contract.

import type {
  TransactionExplanation,
  AccountExplanationResponse,
  AccountHistoryResponse,
} from "./explanation-schema";

export type AnyApiSchema =
  | TransactionExplanation
  | AccountExplanationResponse
  | AccountHistoryResponse;

/// Identity function — the backend no longer versions responses.
/// This exists as a typed entrypoint for callers that previously used
/// migrateToLatest and can be removed once all call sites are updated.
export function migrateToLatest(response: unknown): AnyApiSchema {
  return response as AnyApiSchema;
}
