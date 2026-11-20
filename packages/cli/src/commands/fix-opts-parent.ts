// Fix: guard opts.parent access to prevent crashes (#1326)
// Commands crashed when opts.parent was undefined.
// This helper safely reads parent options with a fallback.

export function getParentOption<T>(
  opts: { parent?: Record<string, unknown> },
  key: string,
  fallback: T
): T {
  if (!opts.parent || typeof opts.parent !== 'object') {
    return fallback;
  }
  const value = opts.parent[key];
  return value !== undefined ? (value as T) : fallback;
}
