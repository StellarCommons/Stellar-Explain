import fs from "fs";
import path from "path";

const EXPECTED_WORKSPACES = ["packages/cli", "packages/ui", "packages/core"];

interface WorkspaceManifest {
  name?: string;
  workspaces?: string[];
}

function readRootManifest(root: string): WorkspaceManifest {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`No package.json found at ${pkgPath}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")) as WorkspaceManifest;
}

export function validateWorkspaces(root: string): void {
  const manifest = readRootManifest(root);
  const declared = manifest.workspaces ?? [];

  const missing = EXPECTED_WORKSPACES.filter((ws) => !declared.includes(ws));

  if (missing.length > 0) {
    throw new Error(
      `Missing workspaces in root package.json: ${missing.join(", ")}`
    );
  }
}

export function listWorkspaces(root: string): string[] {
  const manifest = readRootManifest(root);
  return manifest.workspaces ?? [];
}

export function isCliRegistered(root: string): boolean {
  const workspaces = listWorkspaces(root);
  return workspaces.includes("packages/cli");
}
