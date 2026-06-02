/**
 * CLI Architecture reference — issue #344
 * Documents command flow, config resolution, cache strategy, and module layout.
 */

export const MODULE_LAYOUT = {
  commands: "src/commands/   — one file per CLI subcommand",
  formatters: "src/formatters/ — output renderers (text / JSON)",
  lib: "src/lib/        — shared utilities (config, cache, network, errors)",
  types: "src/types/      — shared TypeScript interfaces",
} as const;

export const COMMAND_FLOW: string[] = [
  "1. bin/stellar-explain → src/index.ts (Commander root)",
  "2. Commander parses argv and routes to the matching command file",
  "3. Command validates flags via src/lib/validate.ts",
  "4. Command calls src/lib/client.ts to hit the Stellar Explain API",
  "5. Response is passed to the matching formatter",
  "6. Formatter writes to stdout; errors go through src/lib/errorHandler.ts",
];

export const CONFIG_RESOLUTION_ORDER: string[] = [
  "1. CLI flag  (--url, --no-cache, …)",
  "2. Environment variable  (STELLAR_EXPLAIN_URL, …)",
  "3. Local config file  (~/.stellar-explain/config.json)",
  "4. Built-in default  (http://localhost:3000)",
];

export const CACHE_STRATEGY = {
  store: "~/.stellar-explain/cache/",
  keyScheme: "sha256(endpoint + serialisedParams)",
  ttlSeconds: 300,
  bypass: "--no-cache flag or STELLAR_EXPLAIN_NO_CACHE=1",
  eviction: "stellar-explain cache clear",
} as const;

export function printArchitectureSummary(): void {
  console.log("=== CLI Architecture ===\n");

  console.log("Module layout:");
  Object.values(MODULE_LAYOUT).forEach((line) => console.log(" ", line));

  console.log("\nCommand flow:");
  COMMAND_FLOW.forEach((step) => console.log(" ", step));

  console.log("\nConfig resolution order:");
  CONFIG_RESOLUTION_ORDER.forEach((rule) => console.log(" ", rule));

  console.log("\nCache strategy:");
  Object.entries(CACHE_STRATEGY).forEach(([k, v]) =>
    console.log(`  ${k}: ${v}`)
  );
}
