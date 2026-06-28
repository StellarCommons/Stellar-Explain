import { readConfigFile } from "./configFile";
import { resolveBaseUrlInput } from "../config/env";

const DEFAULT_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT = 5000;

export function shouldUseColorOutput(stdout: Pick<NodeJS.WriteStream, "isTTY"> = process.stdout): boolean {
  return Boolean(stdout.isTTY) && process.env.NO_COLOR !== "1";
}

export function colorize(text: string, code: number, enabled: boolean): string {
  return enabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}

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
      `Warning: base URL is set to a non-HTTPS URL (${url}). ` +
      `Data will be transmitted over an insecure connection.\n`
    );
  }
}

export function resolveBaseUrl(flagUrl?: string): string {
  const fileConfig = readConfigFile();
  return resolveBaseUrlInput(flagUrl, fileConfig.url) ?? DEFAULT_URL;
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
  const baseUrl = resolveBaseUrl(url);
  warnIfInsecure(baseUrl);
  return {
    baseUrl,
    timeout: resolveTimeout(),
  };
}

export function buildUrl(base: string, path: string): string {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}
