/**
 * Changelog entry builder for @stellar-explain/cli.
 * Generates structured release notes for CHANGELOG.md.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  added?: string[];
  fixed?: string[];
  changed?: string[];
}

export function formatEntry(entry: ChangelogEntry): string {
  const lines: string[] = [`## [${entry.version}] — ${entry.date}`, ""];

  const section = (title: string, items?: string[]) => {
    if (items && items.length > 0) {
      lines.push(`### ${title}`);
      items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
  };

  section("Added", entry.added);
  section("Changed", entry.changed);
  section("Fixed", entry.fixed);

  return lines.join("\n").trimEnd();
}

export const INITIAL_RELEASE: ChangelogEntry = {
  version: "0.1.0",
  date: "2026-04-28",
  added: [
    "`tx <hash>` — explain a Stellar transaction",
    "`account <id>` — explain a Stellar account",
    "`health` — check API health",
    "`batch` — explain multiple transactions from a file",
    "`watch <hash>` — poll a transaction until confirmed",
    "`history` — view past lookups",
    "`version` — print CLI version",
    "`config get/set/list` — manage local config",
    "`--url` global flag to target a custom API instance",
    "`--json` global flag for raw JSON output",
    "Local `.stellar-explain.json` config file support",
    "Retry logic with exponential backoff",
    "Cache layer for repeated lookups",
  ],
};
