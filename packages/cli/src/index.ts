#!/usr/bin/env node
import { Command } from "commander";
import { resolveBaseUrl } from "./lib/config.js";
import { registerTx } from "./commands/tx.js";
import { registerAccount } from "./commands/account.js";
import { registerHealth } from "./commands/health.js";
import { InvalidInputError } from "./lib/errors.js";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("stellar-explain")
  .version(version)
  .option("--url <url>", "API base URL")
  .option("--timeout <ms>", "Request timeout in ms", (v) => parseInt(v, 10), 10000) // #276
  .option("--verbose", "Log request details to stderr", false)                       // #277
  .option("--json", "Output raw JSON", false);

// Resolve --url after parsing
program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts<{ url?: string }>();
  if (!opts.url) thisCommand.setOptionValue("url", resolveBaseUrl());
});

registerTx(program);
registerAccount(program);
registerHealth(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err instanceof InvalidInputError ? 2 : 1;
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
});
