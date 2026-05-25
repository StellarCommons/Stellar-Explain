/**
 * Environment variable validation.
 *
 * Import this module anywhere env vars are needed.
 * In development: throws a clear error if required vars are missing.
 * In production: logs a warning and falls back to safe defaults.
 */

const isDev = process.env.NODE_ENV === 'development';

function requireEnv(key: string, fallback: string): string {
  const value = process.env[key];

  if (!value) {
    const message = [
      `[Stellar Explain] Missing environment variable: ${key}`,
      `  Copy .env.local.example to .env.local and set ${key}.`,
      `  Falling back to: "${fallback}"`,
    ].join('\n');

    if (isDev) {
      throw new Error(message);
    } else {
      console.warn(message);
      return fallback;
    }
  }

  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ── Validated variables ────────────────────────────────────────────────────

/**
 * The base URL of the Rust backend.
 * Server-side only — never exposed to the browser.
 * Set via API_URL in .env.local.
 */
export const API_URL = requireEnv('API_URL', 'http://localhost:4000');

/**
 * The active Stellar network.
 * Used for display purposes in the UI (e.g. network badge in Navbar).
 * Must be 'mainnet' or 'testnet'.
 */
export const STELLAR_NETWORK = optionalEnv(
  'NEXT_PUBLIC_STELLAR_NETWORK',
  'testnet',
) as 'mainnet' | 'testnet';