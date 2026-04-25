import chalk from "chalk";
import { TransactionExplanation, PaymentExplanation } from "@stellar-explain/sdk";
import { getConfig } from "../lib/config";

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}

function row(from: string, to: string, amount: string, asset: string): string {
  const c = getConfig();
  const f = c.noColor ? (s: string) => s : chalk.cyan;
  return [
    f(truncate(from, 20)).padEnd(22),
    f(truncate(to, 20)).padEnd(22),
    amount.padStart(14),
    asset.padEnd(12),
  ].join("  ");
}

function header(): string {
  const c = getConfig();
  const h = c.noColor ? (s: string) => s : chalk.bold.white;
  return [
    h("From".padEnd(22)),
    h("To".padEnd(22)),
    h("Amount".padStart(14)),
    h("Asset".padEnd(12)),
  ].join("  ");
}

export function formatPaymentsTable(tx: TransactionExplanation): string {
  if (tx.payments.length === 0) return chalk.dim("No payments in this transaction.");

  const divider = "─".repeat(76);
  const lines: string[] = [header(), divider];

  for (const p of tx.payments) {
    lines.push(row(p.from, p.to, p.amount, p.asset));
  }

  lines.push(divider);
  lines.push(`  ${tx.payments.length} payment(s)  ·  ${tx.status}  ·  ledger ${tx.ledger}`);
  return lines.join("\n");
}
