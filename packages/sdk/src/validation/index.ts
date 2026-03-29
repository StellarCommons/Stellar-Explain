import { UpstreamError } from "../errors";
import type {
  TransactionExplanation,
  AccountExplanation,
  HealthResponse,
} from "../types";

export function assertTransactionExplanation(
  data: unknown
): asserts data is TransactionExplanation {
  const d = data as Record<string, unknown>;
  if (
    typeof d?.hash !== "string" ||
    (d.status !== "success" && d.status !== "failed") ||
    !Array.isArray(d.payments)
  ) {
    throw new UpstreamError("Unexpected transaction response shape");
  }
}

export function assertAccountExplanation(
  data: unknown
): asserts data is AccountExplanation {
  const d = data as Record<string, unknown>;
  if (
    typeof d?.address !== "string" ||
    !Array.isArray(d.balances) ||
    !Array.isArray(d.signers)
  ) {
    throw new UpstreamError("Unexpected account response shape");
  }
}

export function assertHealthResponse(
  data: unknown
): asserts data is HealthResponse {
  const d = data as Record<string, unknown>;
  if (typeof d?.status !== "string") {
    throw new UpstreamError("Unexpected health response shape");
  }
}
