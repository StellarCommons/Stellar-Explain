import type { StellarExplainError } from "../errors";

export interface NetworkHooks {
  onRequest?: (url: string) => void;
  onResponse?: (url: string, status: number, durationMs: number) => void;
  onError?: (url: string, error: StellarExplainError) => void;
  onCacheHit?: (key: string) => void;
}

export function callHook<T extends (...args: never[]) => void>(
  hook: T | undefined,
  ...args: Parameters<T>
): void {
  if (!hook) return;
  try {
    hook(...args);
  } catch {
    // hooks must never propagate errors to the consumer
  }
}
