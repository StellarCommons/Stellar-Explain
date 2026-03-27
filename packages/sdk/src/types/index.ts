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
  ledger_closed_at: string | null;
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

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface StellarExplainClientOptions {
  /** Base URL of the Stellar Explain API (no trailing slash). */
  baseUrl: string;
  /** Request timeout in milliseconds. Defaults to 30 000. */
  timeoutMs?: number;
}
