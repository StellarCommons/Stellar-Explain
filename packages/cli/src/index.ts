#!/usr/bin/env node
import { Command } from "commander";
import { resolveNetworkUrl } from "./lib/network.js";
import { runUpdateCheck, shouldRunUpdateCheck } from "./lib/updateCheck.js";
import { registerTx } from "./commands/tx.js";
import { registerAccount } from "./commands/account.js";
import { registerHealth } from "./commands/health.js";
import { registerBatch } from "./commands/batch.js";
import { registerExplain } from "./commands/explain.js";
import { registerWatch } from "./commands/watch.js";
import { registerCompletion } from "./commands/completion.js";
import { registerConfigSet } from "./commands/configSet.js";
import { registerConfigGet } from "./commands/configGet.js";
import { registerConfigList } from "./commands/configList.js";
import { BIN_NAME } from "./lib/binName.js";
import { EXIT_CODE } from "./lib/exitCodes.js";
import { parseMs } from "./lib/parseMs.js";
import { readConfigFile } from "./lib/configFile.js";
import { getCliVersion } from "./lib/pkgVersion.js";

const program = new Command();

program
  .name('stellar-explain')
  .description('CLI for exploring and explaining Stellar transactions and accounts')
  .version('0.1.0');

// ── Existing commands (stubs shown; replace with real implementations) ────────

program
  .command('tx <hash>')
  .description('Look up and explain a Stellar transaction')
  .action((hash: string) => {
    addEntry('tx', hash);
    // TODO: delegate to tx command handler
    console.log(`Looking up transaction: ${hash}`);
  });

program
  .command('account <id>')
  .description('Look up and explain a Stellar account')
  .action((id: string) => {
    addEntry('account', id);
    // TODO: delegate to account command handler
    console.log(`Looking up account: ${id}`);
  });

registerHistoryCommand(program);    // #441 / #442 / #443
registerCompletionCommand(program); // #440

program.parse(process.argv);
  .name(BIN_NAME)
  .version(version)
  .option("--url <url>", "API base URL")
  .option("--network <network>", "Stellar network to use (mainnet | testnet)")
  .option("--no-update-check", "Disable startup version checks")
  .option("--timeout <ms>", "Request timeout in ms", (v) => parseInt(v, 10), 10000)
  .option("--retries <n>", "Retry attempts for network errors", (v) => parseInt(v, 10), 2)
  .option("--timeout <ms>", "Request timeout in ms", parseMs, 10000)
  .option("--verbose", "Log request details to stderr", false)
  .option("--no-cache", "Skip reading from and writing to the local response cache")
  .option("--json", "Output raw JSON", false);

program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts<{ url?: string; network?: string; updateCheck?: boolean }>();
  const fileConfig = readConfigFile();
  const rawUrl = opts.url ?? fileConfig.url;
  thisCommand.setOptionValue("url", resolveNetworkUrl(opts.network as any, rawUrl));
  runUpdateCheck(version, shouldRunUpdateCheck(opts.updateCheck, fileConfig.updateCheck));
});

registerTx(program);
registerAccount(program);
registerHealth(program);
registerBatch(program);
registerExplain(program);
registerWatch(program);
registerCompletion(program);
registerConfigSet(program);
registerConfigGet(program);
registerConfigList(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { exitCode?: number }).exitCode ?? EXIT_CODE.ERROR;
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
});
