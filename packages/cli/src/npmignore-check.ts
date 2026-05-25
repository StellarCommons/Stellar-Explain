/**
 * Verifies .npmignore excludes dev-only paths from the published package.
 * Issue #334 — Add .npmignore to keep published package lean.
 */

import fs from "fs";
import path from "path";

const REQUIRED_EXCLUSIONS = [
  "src/",
  "tests/",
  "coverage/",
  "*.config.ts",
  "*.config.js",
  ".prettierrc",
  ".prettierignore",
  "tsconfig.json",
];

export function loadNpmIgnore(root: string): string[] {
  const filePath = path.join(root, ".npmignore");
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function findMissingExclusions(entries: string[]): string[] {
  return REQUIRED_EXCLUSIONS.filter((req) => !entries.includes(req));
}

export function checkNpmIgnore(root: string): void {
  const entries = loadNpmIgnore(root);
  if (entries.length === 0) {
    console.error(".npmignore is missing or empty");
    process.exit(1);
  }
  const missing = findMissingExclusions(entries);
  if (missing.length > 0) {
    console.error("Missing exclusions in .npmignore:\n" + missing.join("\n"));
    process.exit(1);
  }
  console.log(".npmignore OK — all required exclusions present");
}
