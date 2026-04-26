export const DEFAULT_RETRIES = 2;

export function resolveRetries(flag?: number): number {
  return flag !== undefined && flag >= 0 ? flag : DEFAULT_RETRIES;
}