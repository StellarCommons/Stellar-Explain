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
  .option("--timeout <ms>", "Request timeout in ms", (v) => parseInt(v, 10), 10000)
  .option("--verbose", "Log request details to stderr", false)
  .option("--json", "Output raw JSON", false);

program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts<{ url?: string }>();
  thisCommand.setOptionValue("url", resolveBaseUrl(opts.url));
});

registerTx(program);
registerAccount(program);
registerHealth(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof InvalidInputError) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
  process.stderr.write(`Unexpected error: ${(err as Error).message}\n`);
  process.exit(1);
});
