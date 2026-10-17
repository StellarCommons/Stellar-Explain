// Fix: stop converting ApiError objects to '[object Object]' (#1310)
export function toErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj['message'] === 'string') return obj['message'];
    if (typeof obj['error'] === 'string') return obj['error'];
  }
  return 'An unexpected error occurred';
}
