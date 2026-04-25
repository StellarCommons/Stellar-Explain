// CLI entry point. Registers global --url and --json flags on every command.

import { txCommand, accountCommand, healthCommand, GlobalFlags } from "./commands/index";

const args = process.argv.slice(2);

function parseFlags(argv: string[]): { positional: string[]; flags: GlobalFlags } {
  const flags: GlobalFlags = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url" && argv[i + 1]) {
      flags.url = argv[++i];
    } else if (argv[i] === "--json") {
      flags.json = true;
    } else {
      positional.push(argv[i]);
    }
  }

  return { positional, flags };
}

async function main(): Promise<void> {
  const { positional, flags } = parseFlags(args);
  const [command, arg] = positional;

  switch (command) {
    case "tx":
      if (!arg) { console.error("Usage: stellar-explain tx <hash> [--url <url>] [--json]"); process.exit(1); }
      await txCommand(arg, flags);
      break;
    case "account":
      if (!arg) { console.error("Usage: stellar-explain account <id> [--url <url>] [--json]"); process.exit(1); }
      await accountCommand(arg, flags);
      break;
    case "health":
      await healthCommand(flags);
      break;
    default:
      console.error("Commands: tx <hash> | account <id> | health");
      console.error("Flags:    --url <baseUrl>  --json");
      process.exit(1);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
