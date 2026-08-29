// TypeScript mirrors of the Rust backend's JSON response shapes.
// These are reference types for frontend contributors and tooling.
//
// For the canonical source of truth, see the Rust structs in:
//   - src/explain/transaction.rs    — TransactionExplanation, OperationExplanation
//   - src/explain/operation/payment.rs — PaymentExplanation
//   - src/routes/account.rs         — AccountExplanationResponse, AccountHistoryResponse

// ── Transaction explanation (GET /tx/:hash) ──────────────────────────────────

export interface OperationExplanation {
  index: number;
  type: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface PaymentExplanation {
  summary: string;
  from: string;
  to: string;
  asset: string;
  amount: string;
  fee_note: string | null;
}

export interface OperationFailure {
  index: number;
  code: string;
  explanation: string;
}

export interface TransactionExplanation {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  operations: OperationExplanation[];
  payment_explanations: PaymentExplanation[];
  skipped_operations: number;
  memo_explanation: string | null;
  fee_explanation: string | null;
  ledger_closed_at: string | null;
  ledger: number | null;
  failure_reason: string | null;
  operation_failures: OperationFailure[];
}

// ── Account explanation (GET /account/:address) ──────────────────────────────

export interface AccountExplanationResponse {
  address: string;
  summary: string;
  xlm_balance: string;
  asset_count: number;
  signer_count: number;
  home_domain: string | null;
  org_name: string | null;
  flag_descriptions: string[];
}

// ── Account history (GET /account/:address/history) ──────────────────────────

export interface AccountHistoryTransaction {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  ledger_closed_at: string | null;
  ledger: number | null;
  operation_count: number;
  fee_explanation: string | null;
}

export interface AccountHistoryResponse {
  address: string;
  transactions: AccountHistoryTransaction[];
  next_cursor: string | null;
  has_more: boolean;
}

// ── Health (GET /health) ────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  network: string;
  horizon_reachable: boolean;
  version: string;
}

// ── Error ───────────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
