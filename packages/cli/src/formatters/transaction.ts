import type { TransactionExplanation } from "../types/index.js";

export function formatTransaction(tx: TransactionExplanation): string {
  const lines: string[] = [
    `Transaction: ${tx.hash}`,
    `Status:      ${tx.status}`,
    `Summary:     ${tx.summary}`,
    `Ledger:      ${tx.ledger}`,
    `Closed at:   ${tx.created_at}`,
    `Fee:         ${tx.fee_charged} stroops`,
  ];

  if (tx.memo) lines.push(`Memo:        ${tx.memo}`);

  if (tx.payments.length > 0) {
    lines.push("", "Payments:");
    const fromW = Math.max(...tx.payments.map((p) => p.from.length));
    const toW   = Math.max(...tx.payments.map((p) => p.to.length));
    const amtW  = Math.max(...tx.payments.map((p) => p.amount.length));
    for (const p of tx.payments) {
      lines.push(
        `  ${p.from.padEnd(fromW)}  →  ${p.to.padEnd(toW)}  ${p.amount.padStart(amtW)}  ${p.asset}`,
      );
    }
  }

  if (tx.skipped_operations > 0)
    lines.push(``, `Skipped ops: ${tx.skipped_operations}`);

  return lines.join("\n");
}
