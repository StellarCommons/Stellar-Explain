import chalk from "chalk";
import type { AccountExplanation } from "../types/index.js";

export function formatAccount(acc: AccountExplanation): string {
  const lines: string[] = [
    `${chalk.bold("Account:")} ${acc.account_id}`,
    `${chalk.bold("Summary:")} ${acc.summary}`,
    `${chalk.bold("Subentries:")} ${acc.subentry_count}`,
    `${chalk.bold("Last ledger:")} ${acc.last_modified_ledger}`,
  ];
  if (acc.home_domain) lines.push(`${chalk.bold("Home domain:")} ${acc.home_domain}`);
  if (acc.balances.length > 0) {
    lines.push("", chalk.bold("Balances:"));
    for (const b of acc.balances) {
      const asset =
        b.asset_type === "native" ? "XLM" : `${b.asset_code ?? ""}:${b.asset_issuer ?? ""}`;
      lines.push(`  ${chalk.cyan(b.balance)} ${asset}`);
    }
  }
  if (acc.signers.length > 0) {
    lines.push("", chalk.bold("Signers:"));
    for (const s of acc.signers) {
      lines.push(`  ${s.key}  weight=${s.weight}`);
    }
  }
  return lines.join("\n");
}
