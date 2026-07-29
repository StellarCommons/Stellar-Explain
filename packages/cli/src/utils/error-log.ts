import { CLI_VERSION } from '../config/env.js';

let cachedNotice: string | null = null;

export async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch('https://registry.npmjs.org/@stellar-explain/cli/latest');
    if (!res.ok) return;
    const pkg = await res.json() as { version: string };
    if (pkg.version && pkg.version !== CLI_VERSION) {
      cachedNotice = `Update available: ${CLI_VERSION} → ${pkg.version}`;
    }
  } catch {
    // ignore network errors
  }
}

export function getUpdateNotice(): string | null {
  return cachedNotice;
}
