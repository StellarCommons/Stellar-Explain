// Fix: remove duplication between api.ts and errors.ts (#1313)
export interface ApiError {
  message: string;
  status?: number;
}
export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'message' in err;
}
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isApiError(err)) return err.message;
  return 'An unexpected error occurred';
}
