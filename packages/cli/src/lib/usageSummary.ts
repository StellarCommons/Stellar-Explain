/**
 * Generates a plain-text CLI usage summary for embedding in README files.
 * Used to keep the root monorepo README in sync with available commands.
 */

export interface CommandDef {
  name: string;
  args?: string;
  description: string;
}

const COMMANDS: CommandDef[] = [
  { name: "tx", args: "<hash>", description: "Explain a transaction" },
  { name: "account", args: "<id>", description: "Explain an account" },
  { name: "health", description: "Check API health" },
  { name: "batch", args: "<file>", description: "Explain transactions from a file" },
  { name: "watch", args: "<hash>", description: "Poll a transaction until confirmed" },
  { name: "history", description: "View past lookups" },
  { name: "version", description: "Print CLI version" },
  { name: "config get/set/list", description: "Manage local config" },
];

export function usageSummary(bin = "stellar-explain"): string {
  const pad = Math.max(...COMMANDS.map((c) => (c.args ? `${c.name} ${c.args}` : c.name).length));
  const rows = COMMANDS.map((c) => {
    const label = c.args ? `${c.name} ${c.args}` : c.name;
    return `  ${bin} ${label.padEnd(pad)}  ${c.description}`;
  });
  return rows.join("\n");
}

export function installSnippet(pkg = "@stellar-explain/cli"): string {
  return `npm install -g ${pkg}`;
}

export function readmeSection(bin = "stellar-explain", pkg = "@stellar-explain/cli"): string {
  return [
    "## CLI",
    "",
    "```sh",
    installSnippet(pkg),
    "```",
    "",
    "**Commands**",
    "",
    "```",
    usageSummary(bin),
    "```",
    "",
    `Use \`${bin} <command> --help\` for details on any command.`,
  ].join("\n");
}
