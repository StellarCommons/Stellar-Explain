import type { AccountExplanation } from "../types/index.js";

export function formatAccount(acc: AccountExplanation): string {
  const lines: string[] = [
    `Account:     ${acc.account_id}`,
    `Summary:     ${acc.summary}`,
    `Subentries:  ${acc.subentry_count}`,
    `Last ledger: ${acc.last_modified_ledger}`,
  ];

  if (acc.home_domain) lines.push(`Home domain: ${acc.home_domain}`);

  if (acc.balances.length > 0) {
    lines.push("", "Balances:");
    for (const b of acc.balances) {
      const asset = b.asset_type === "native" ? "XLM" : `${b.asset_code ?? ""}:${b.asset_issuer ?? ""}`;
      lines.push(`  ${b.balance}  ${asset}`);
    }
  }

  if (acc.signers.length > 0) {
    lines.push("", "Signers:");
    for (const s of acc.signers) {
      lines.push(`  ${s.key}  weight=${s.weight}`);
    }
  }

  return lines.join("\n");
}
