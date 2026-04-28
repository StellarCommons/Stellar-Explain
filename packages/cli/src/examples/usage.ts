/**
 * CLI usage examples — issue #347
 * Programmatic equivalents of the explain-tx, batch-from-file,
 * and watch-pending shell script workflows.
 */

import { execSync, ExecSyncOptions } from "child_process";

const RUN: ExecSyncOptions = { stdio: "inherit", encoding: "utf8" };

/** Explain a single transaction by hash. */
export function explainTx(hash: string, url?: string): void {
  const env = url ? `STELLAR_EXPLAIN_URL=${url} ` : "";
  execSync(`${env}stellar-explain tx ${hash}`, RUN);
}

/** Explain every hash listed in a plain-text file (one hash per line). */
export function batchFromFile(filePath: string): void {
  execSync(`stellar-explain batch --file ${filePath}`, RUN);
}

/** Watch a pending transaction until it is confirmed or times out. */
export function watchPending(hash: string, intervalSec = 5): void {
  execSync(`stellar-explain watch ${hash} --interval ${intervalSec}`, RUN);
}

/** Run all three example workflows in sequence (demo / smoke-test). */
export function runAllExamples(): void {
  const DEMO_HASH =
    "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889";

  console.log("--- explain single tx ---");
  explainTx(DEMO_HASH);

  console.log("\n--- batch from file ---");
  batchFromFile("examples/hashes.txt");

  console.log("\n--- watch pending tx ---");
  watchPending(DEMO_HASH, 3);
}

// Run when executed directly: ts-node src/examples/usage.ts
if (require.main === module) {
  runAllExamples();
}
