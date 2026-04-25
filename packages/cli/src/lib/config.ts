const DEFAULT_URL = "http://localhost:8080";

export function resolveBaseUrl(flagUrl?: string): string {
  return flagUrl ?? process.env["STELLAR_EXPLAIN_URL"] ?? DEFAULT_URL;
}

/** True when stdout is an interactive terminal. Disables spinner and chalk when false. */
export const isTTY: boolean = process.stdout.isTTY === true;
