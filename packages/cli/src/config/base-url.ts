const DEFAULT_URL = "https://horizon.stellar.org";

export function resolveBaseUrl(flagUrl?: string): string {
  if (flagUrl) return flagUrl;
  if (process.env.STELLAR_EXPLAIN_URL) return process.env.STELLAR_EXPLAIN_URL;
  return DEFAULT_URL;
}
