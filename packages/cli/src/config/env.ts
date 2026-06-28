export const STELLAR_EXPLAIN_TOKEN_ENV = "STELLAR_EXPLAIN_TOKEN";

export function getEnvApiToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = env[STELLAR_EXPLAIN_TOKEN_ENV]?.trim();
  return token || undefined;
}
