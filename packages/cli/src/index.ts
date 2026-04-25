#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { StellarExplainClient } from "@stellar-explain/sdk";
import { setConfig } from "./lib/config";
import { formatPaymentsTable } from "./formatters/transaction";
import { formatBalancesTable, formatSignersTable } from "./formatters/account";

const program = new Command();

program
  .name("stellar-explain")
  .description("CLI for the Stellar Explain API")
  .version("0.1.0")
  .option("--no-color", "Disable chalk color output")
  .hook("preAction", (cmd) => {
    const opts = cmd.opts();
    setConfig({ noColor: opts.color === false });
  });

program
  .command("tx <hash>")
  .description("Explain a transaction and show its payments as a table")
  .option("--base-url <url>", "API base URL", "http://localhost:3000")
  .action(async (hash: string, opts) => {
    const client = new StellarExplainClient({ baseUrl: opts.baseUrl });
    const tx = await client.explainTransaction(hash);
    console.log(chalk.bold(`\nTransaction: ${tx.hash}`));
    console.log(chalk.dim(tx.summary), "\n");
    console.log(formatPaymentsTable(tx));
  });

program
  .command("account <address>")
  .description("Explain an account, showing balances and signers as tables")
  .option("--base-url <url>", "API base URL", "http://localhost:3000")
  .action(async (address: string, opts) => {
    const client = new StellarExplainClient({ baseUrl: opts.baseUrl });
    const acc = await client.explainAccount(address);
    console.log(chalk.bold(`\nAccount: ${acc.account_id}`));
    console.log(chalk.dim(acc.summary), "\n");
    console.log(chalk.underline("Balances"));
    console.log(formatBalancesTable(acc), "\n");
    console.log(chalk.underline("Signers"));
    console.log(formatSignersTable(acc));
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
