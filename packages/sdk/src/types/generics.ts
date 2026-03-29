import type { TransactionExplanation, AccountExplanation } from "./index";

/**
 * Extends the SDK's response types with consumer-defined extra fields.
 *
 * Usage:
 *   const client = new StellarExplainClient<{ internal_notes: string }>();
 *   const tx = await client.explainTransaction(hash);
 *   tx.internal_notes; // typed, no cast needed
 */
export type ExtendedTransactionExplanation<TxExt = Record<string, never>> =
  TransactionExplanation & TxExt;

export type ExtendedAccountExplanation<AccountExt = Record<string, never>> =
  AccountExplanation & AccountExt;
