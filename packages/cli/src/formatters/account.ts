import type { AccountExplanation } from "../types/index.js";
import { colorize } from "../lib/config.js";

export function formatAccount(acc: AccountExplanation, useColor = false): string {
  const lines: string[] = [
    `${colorize("Account:", 1, useColor)}     ${acc.account_id}`,
    `${colorize("Summary:", 1, useColor)}     ${acc.summary}`,
    `${colorize("Subentries:", 1, useColor)}  ${acc.subentry_count}`,
    `${colorize("Last ledger:", 1, useColor)} ${acc.last_modified_ledger}`,
  ];

  if (acc.home_domain) lines.push(`${colorize("Home domain:", 1, useColor)} ${acc.home_domain}`);

  if (acc.balances.length > 0) {
    lines.push("", "Balances:");
    for (const b of acc.balances) {
      const asset = b.asset_type === "native" ? "XLM" : `${b.asset_code ?? ""}:${b.asset_issuer ?? ""}`;
      lines.push(`  ${colorize(b.balance, 32, useColor)}  ${asset}`);
    }
  }

  if (acc.signers.length > 0) {
    lines.push("", "Signers:");
    for (const s of acc.signers) {
      lines.push(`  ${s.key}  ${colorize(`weight=${s.weight}`, 36, useColor)}`);
    }
  }

  return lines.join("\n");
}
