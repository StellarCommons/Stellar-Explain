import type { TransactionExplanation } from "../types/index.js";
import { colorize } from "../lib/config.js";

export function formatTransaction(tx: TransactionExplanation, useColor = false): string {
  const lines: string[] = [
    `${colorize("Transaction:", 1, useColor)} ${tx.hash}`,
    `${colorize("Status:", 1, useColor)}      ${colorize(tx.status, tx.status === "success" ? 32 : 31, useColor)}`,
    `${colorize("Summary:", 1, useColor)}     ${tx.summary}`,
    `${colorize("Ledger:", 1, useColor)}      ${tx.ledger}`,
    `${colorize("Closed at:", 1, useColor)}   ${tx.created_at}`,
    `${colorize("Fee:", 1, useColor)}         ${tx.fee_charged} stroops`,
  ];

  if (tx.memo) lines.push(`${colorize("Memo:", 1, useColor)}        ${tx.memo}`);

  if (tx.payments.length > 0) {
    lines.push("", "Payments:");
    const fromW = Math.max(...tx.payments.map((p) => p.from.length));
    const toW   = Math.max(...tx.payments.map((p) => p.to.length));
    const amtW  = Math.max(...tx.payments.map((p) => p.amount.length));
    for (const p of tx.payments) {
      lines.push(`  ${p.from} → ${p.to}  ${colorize(p.amount, 32, useColor)} ${p.asset}`);
    }
  }

  if (tx.skipped_operations > 0)
    lines.push(``, `${colorize("Skipped ops:", 1, useColor)} ${tx.skipped_operations}`);

  return lines.join("\n");
}
