/**
 * Man page generator — issue #345
 * Reads Commander help output and writes a Unix man page to man/stellar-explain.1
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(__dirname, "..", "man");
const OUT_FILE = join(OUT_DIR, "stellar-explain.1");

function getHelpText(): string {
  try {
    return execSync("node dist/index.js --help", { encoding: "utf8" });
  } catch (e: any) {
    return e.stdout ?? "";
  }
}

function helpToMan(help: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const escaped = help
    .replace(/\\/g, "\\\\")
    .replace(/^-/gm, "\\-")
    .replace(/'/g, "\\(aq");

  return [
    `.TH STELLAR-EXPLAIN 1 "${date}" "stellar-explain" "User Commands"`,
    ".SH NAME",
    "stellar-explain \\- explain Stellar blockchain transactions",
    ".SH SYNOPSIS",
    ".B stellar-explain",
    "[command] [options]",
    ".SH DESCRIPTION",
    "Stellar Explain CLI fetches and explains Stellar transactions in plain English.",
    ".SH OPTIONS",
    ".nf",
    escaped,
    ".fi",
    ".SH ENVIRONMENT",
    ".TP",
    ".B STELLAR_EXPLAIN_URL",
    "Base URL of the Stellar Explain API (default: http://localhost:3000).",
    ".SH SEE ALSO",
    "Full docs: https://github.com/StellarCommons/Stellar-Explain",
  ].join("\n");
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const help = getHelpText();
  const man = helpToMan(help);
  writeFileSync(OUT_FILE, man, "utf8");
  console.log(`Man page written to ${OUT_FILE}`);
}

main();
