/**
 * API client for Stellar Explain.
 *
 * All requests go through Next.js proxy routes (/api/*)
 * so the Rust backend URL never reaches the browser.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface PaymentExplanation {
  summary: string;
  from: string;
  to: string;
  asset: string;
  amount: string;
}

export interface TransactionExplanation {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  payment_explanations: PaymentExplanation[];
  skipped_operations: number;
  memo_explanation: string | null;
  fee_explanation: string | null;
  /** ISO 8601 timestamp of ledger close (Issue #29) */
  ledger_closed_at: string | null;
  /** Ledger sequence number (Issue #29) */
  ledger: number | null;
}

export interface AccountExplanation {
  address: string;
  summary: string;
  xlm_balance: string;
  asset_count: number;
  signer_count: number;
  home_domain: string | null;
  org_name: string | null;
  flag_descriptions: string[];
}

export interface HealthResponse {
  status: string;
  network: string;
  horizon_reachable: boolean;
  version: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiError).error?.code === "string"
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as T;
}

// ── Fetch Functions ────────────────────────────────────────────────────────

export async function fetchTransaction(hash: string): Promise<TransactionExplanation> {
  const res = await fetch(`/api/tx/${hash}`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<TransactionExplanation>(res);
}

export async function fetchAccount(address: string): Promise<AccountExplanation> {
  const res = await fetch(`/api/account/${address}`, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<AccountExplanation>(res);
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health", {
    headers: { Accept: "application/json" },
  });
  return handleResponse<HealthResponse>(res);
}