import chalk from "chalk";
import type { TransactionExplanation } from "../types/index.js";

export function formatTransaction(tx: TransactionExplanation): string {
  const statusColor = tx.status === "success" ? chalk.green : chalk.red;
  const lines: string[] = [
    `${chalk.bold("Transaction:")} ${tx.hash}`,
    `${chalk.bold("Status:")} ${statusColor(tx.status)}`,
    `${chalk.bold("Summary:")} ${tx.summary}`,
    `${chalk.bold("Ledger:")} ${tx.ledger}`,
    `${chalk.bold("Closed at:")} ${tx.created_at}`,
    `${chalk.bold("Fee:")} ${tx.fee_charged} stroops`,
  ];
  if (tx.memo) lines.push(`${chalk.bold("Memo:")} ${tx.memo}`);
  if (tx.payments.length > 0) {
    lines.push("", chalk.bold("Payments:"));
    for (const p of tx.payments) {
      lines.push(`  ${p.from} → ${p.to}  ${chalk.cyan(p.amount)} ${p.asset}`);
    }
  }
  if (tx.skipped_operations > 0)
    lines.push(chalk.yellow(`\n${tx.skipped_operations} operation(s) skipped`));
  return lines.join("\n");
}
