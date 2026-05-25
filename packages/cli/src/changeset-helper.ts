/**
 * Reads and validates the Changesets config for the CLI package.
 * Issue #335 — Add Changesets for CLI version management.
 */

import fs from "fs";
import path from "path";

interface ChangesetConfig {
  $schema: string;
  changelog: string;
  commit: boolean;
  access: "public" | "restricted";
  baseBranch: string;
  updateInternalDependencies: "patch" | "minor";
  ignore: string[];
}

export function loadChangesetConfig(root: string): ChangesetConfig | null {
  const configPath = path.join(root, ".changeset", "config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as ChangesetConfig;
  } catch {
    return null;
  }
}

export function validateChangesetConfig(config: ChangesetConfig): string[] {
  const errors: string[] = [];
  if (config.access !== "public") errors.push(`access should be "public"`);
  if (config.baseBranch !== "main") errors.push(`baseBranch should be "main"`);
  if (config.commit !== false) errors.push(`commit should be false`);
  return errors;
}

export function checkChangesetSetup(root: string): void {
  const config = loadChangesetConfig(root);
  if (!config) {
    console.error("Missing .changeset/config.json");
    process.exit(1);
  }
  const errors = validateChangesetConfig(config);
  if (errors.length > 0) {
    console.error("Changeset config issues:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("Changeset config OK");
}
