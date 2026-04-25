#!/usr/bin/env node
import { Command } from "commander";
import { txCommand } from "./commands/tx";
import { accountCommand } from "./commands/account";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("stellar-explain")
  .version(version)
  .addCommand(txCommand)
  .addCommand(accountCommand)
  .parse();
