import chalk from "chalk";
import { AccountExplanation, AssetBalance, Signer } from "@stellar-explain/sdk";
import { getConfig } from "../lib/config";

const c = () => getConfig();
const h = (s: string) => (c().noColor ? s : chalk.bold.white(s));
const dim = (s: string) => (c().noColor ? s : chalk.dim(s));
const cyan = (s: string) => (c().noColor ? s : chalk.cyan(s));

function assetLabel(b: AssetBalance): string {
  return b.asset_type === "native" ? "XLM" : `${b.asset_code ?? "?"}:${(b.asset_issuer ?? "").slice(0, 8)}…`;
}

export function formatBalancesTable(account: AccountExplanation): string {
  if (account.balances.length === 0) return dim("No balances.");

  const divider = "─".repeat(46);
  const lines = [
    [h("Asset".padEnd(22)), h("Balance".padStart(20))].join("  "),
    divider,
  ];

  for (const b of account.balances) {
    lines.push([cyan(assetLabel(b).padEnd(22)), b.balance.padStart(20)].join("  "));
  }

  lines.push(divider);
  return lines.join("\n");
}

export function formatSignersTable(account: AccountExplanation): string {
  if (account.signers.length === 0) return dim("No signers.");

  const divider = "─".repeat(72);
  const lines = [
    [h("Key".padEnd(56)), h("Weight".padStart(6)), h("Type".padEnd(24))].join("  "),
    divider,
  ];

  for (const s of account.signers) {
    lines.push([
      cyan(s.key.padEnd(56)),
      String(s.weight).padStart(6),
      s.type.padEnd(24),
    ].join("  "));
  }

  lines.push(divider);
  return lines.join("\n");
}
