import { readConfigFile } from "./configFile";

const DEFAULT_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT = 5000;

function isLocalhost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function warnIfInsecure(url: string): void {
  if (url.startsWith("http://") && !isLocalhost(url)) {
    process.stderr.write(
      `Warning: STELLAR_EXPLAIN_URL is set to a non-HTTPS URL (${url}). ` +
      `Data will be transmitted over an insecure connection.\n`
    );
  }
}

export function resolveBaseUrl(flagUrl?: string): string {
  const fileConfig = readConfigFile();
  const url = flagUrl ?? process.env["STELLAR_EXPLAIN_URL"] ?? fileConfig.url ?? DEFAULT_URL;
  warnIfInsecure(url);
  return url;
}

export function resolveTimeout(flagTimeout?: number): number {
  const fileConfig = readConfigFile();
  return flagTimeout ?? fileConfig.timeout ?? DEFAULT_TIMEOUT;
}

export function validateUrl(url: string): string {
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  return url;
}

export function loadConfig(url?: string): { baseUrl: string; timeout: number } {
  return {
    baseUrl: resolveBaseUrl(url),
    timeout: resolveTimeout(),
  };
}

export function buildUrl(base: string, path: string): string {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}