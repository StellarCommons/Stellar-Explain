// Mirrors the Stellar Explain API response shapes for use across CLI commands.

export interface PaymentExplanation {
  from: string;
  to: string;
  amount: string;
  asset: string;
  summary: string;
}

export interface TransactionExplanation {
  hash: string;
  summary: string;
  status: "success" | "failed";
  ledger: number;
  created_at: string;
  fee_charged: string;
  memo: string | null;
  payments: PaymentExplanation[];
  skipped_operations: number;
}

export interface AssetBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface Signer {
  key: string;
  weight: number;
  type: string;
}

export interface AccountExplanation {
  account_id: string;
  summary: string;
  last_modified_ledger: number;
  subentry_count: number;
  home_domain?: string;
  balances: AssetBalance[];
  signers: Signer[];
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  horizon_reachable: boolean;
  version: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
