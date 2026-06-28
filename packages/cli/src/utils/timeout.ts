const DEFAULT_TIMEOUT_S = 10;

export function parseTimeout(raw: string | number | undefined): number {
  if (raw === undefined) return DEFAULT_TIMEOUT_S;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(n) || n <= 0) {
    throw new Error("--timeout must be a positive integer (seconds)");
  }
  return n;
}

export function withTimeout<T>(
  promise: Promise<T>,
  seconds: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${seconds}s`)), seconds * 1000)
    ),
  ]);
}
