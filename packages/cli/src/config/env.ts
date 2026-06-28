export const STELLAR_EXPLAIN_URL_ENV = "STELLAR_EXPLAIN_URL";

export function getEnvBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[STELLAR_EXPLAIN_URL_ENV]?.trim();
  return value || undefined;
}

export function resolveBaseUrlInput(flagUrl?: string, fileUrl?: string): string | undefined {
  return flagUrl ?? getEnvBaseUrl() ?? fileUrl;
}
