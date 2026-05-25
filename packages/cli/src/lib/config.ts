const DEFAULT_URL = "http://localhost:8080";

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
  const url = flagUrl ?? process.env["STELLAR_EXPLAIN_URL"] ?? DEFAULT_URL;
  warnIfInsecure(url);
  return url;
}
