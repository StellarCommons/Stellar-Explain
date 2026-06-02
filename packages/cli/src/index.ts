#!/usr/bin/env node
import { Command } from "commander";
import { resolveBaseUrl } from "./lib/config.js";
import { runUpdateCheck } from "./lib/updateCheck.js";
import { registerTx } from "./commands/tx.js";
import { registerAccount } from "./commands/account.js";
import { registerHealth } from "./commands/health.js";
import { registerBatch } from "./commands/batch.js";
import { registerWatch } from "./commands/watch.js";
import { InvalidInputError } from "./lib/errors.js";

// #99 — Node version check
const [major = 0] = process.version.replace("v", "").split(".").map(Number);
if (major < 18) {
  process.stderr.write(`Error: Node.js 18 or higher is required (found ${process.version}).\n`);
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json") as { version: string };

// #100 — Non-blocking update check
runUpdateCheck(version);

const program = new Command();
program
  .name("stellar-explain")
  .version(version)
  .option("--url <url>", "API base URL")
  .option("--timeout <ms>", "Request timeout in ms", (v) => parseInt(v, 10), 10000)
  .option("--verbose", "Log request details to stderr", false)
  .option("--json", "Output raw JSON", false);

program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts<{ url?: string }>();
  if (!opts.url) thisCommand.setOptionValue("url", resolveBaseUrl());
});

registerTx(program);
registerAccount(program);
registerHealth(program);
registerBatch(program);
registerWatch(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err instanceof InvalidInputError ? 2 : 1;
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
});
