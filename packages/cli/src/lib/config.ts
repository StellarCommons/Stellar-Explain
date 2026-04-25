// Resolves the API base URL from --url flag, STELLAR_EXPLAIN_URL env var, or default.

const DEFAULT_URL = "https://api.stellar-explain.dev";

export interface CliConfig {
  baseUrl: string;
}

/**
 * Resolves the base URL in priority order:
 * 1. --url flag value passed explicitly
 * 2. STELLAR_EXPLAIN_URL environment variable
 * 3. Built-in default
 */
export function loadConfig(flagUrl?: string): CliConfig {
  const baseUrl =
    flagUrl?.trim() ||
    process.env.STELLAR_EXPLAIN_URL?.trim() ||
    DEFAULT_URL;

  return { baseUrl };
}

/**
 * Validates that a URL string is well-formed.
 * Throws if the value cannot be parsed as a URL.
 */
export function validateUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // Strip trailing slash for consistent path joining
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid URL: "${raw}"`);
  }
}

/**
 * Builds a full endpoint URL from a base URL and a path segment.
 */
export function buildUrl(base: string, path: string): string {
  const normalised = base.replace(/\/$/, "");
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `${normalised}${segment}`;
}
