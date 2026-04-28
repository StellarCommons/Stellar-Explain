interface CommandDoc {
  name: string;
  description: string;
  flags?: string[];
  example: string;
}

const COMMANDS: CommandDoc[] = [
  {
    name: "tx <hash>",
    description: "Fetch and explain a Stellar transaction by hash.",
    flags: ["--url <url>", "--json", "--no-cache"],
    example: "stellar-explain tx ABC123...",
  },
  {
    name: "account <address>",
    description: "Explain a Stellar account and its recent activity.",
    flags: ["--url <url>", "--json", "--limit <n>"],
    example: "stellar-explain account GABC...",
  },
  {
    name: "health",
    description: "Check whether the backend API is reachable.",
    flags: ["--url <url>"],
    example: "stellar-explain health",
  },
  {
    name: "config set <key> <value>",
    description: "Persist a configuration value.",
    example: "stellar-explain config set url http://localhost:3000",
  },
  {
    name: "history",
    description: "List recently explained transactions.",
    flags: ["--limit <n>", "--clear"],
    example: "stellar-explain history --limit 5",
  },
];

function renderCommand(cmd: CommandDoc): string {
  const flags = cmd.flags ? `\n  Flags: ${cmd.flags.join(", ")}` : "";
  return `### \`${cmd.name}\`\n${cmd.description}${flags}\n\`\`\`\n${cmd.example}\n\`\`\``;
}

export function generateReadme(): string {
  const sections = COMMANDS.map(renderCommand).join("\n\n");
  return `# stellar-explain CLI\n\n## Commands\n\n${sections}\n`;
}
