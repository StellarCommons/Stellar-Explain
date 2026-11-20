/**
 * Analytics #125 — Node.js version guard.
 *
 * The package targets Node.js 18+ (see `engines` in `package.json`).
 * Importing the package in an older Node runtime still works, but delivery
 * features that rely on modern `fetch` / `CompressionStream` behaviour may
 * degrade. This module emits a one-time `console.warn` so the incompatibility
 * is visible instead of silent.
 *
 * It is safe to import in browsers, SSR, and test doubles: when `process`
 * (or `process.versions.node`) is unavailable the check resolves to
 * "unknown" and stays silent.
 */

export const MINIMUM_NODE_MAJOR = 18;

let hasWarned = false;

/** Parse the major version from a `process.versions.node` string. */
export function parseNodeMajor(version: string): number | undefined {
  const match = /^v?(\d+)/.exec(version.trim());
  if (!match) return undefined;
  const major = Number.parseInt(match[1], 10);
  return Number.isNaN(major) ? undefined : major;
}

/**
 * Return the running Node.js major version, or `undefined` when not running
 * under Node (browser, edge runtime, or a test stub without versions).
 */
export function getNodeMajorVersion(): number | undefined {
  if (typeof process === 'undefined') return undefined;
  const versions = (process as { versions?: { node?: unknown } }).versions;
  if (!versions || typeof versions.node !== 'string') return undefined;
  return parseNodeMajor(versions.node);
}

/**
 * Whether the current runtime satisfies the minimum Node.js version.
 * Returns `undefined` when the runtime cannot be determined (non-Node),
 * so callers can distinguish "unknown" from "unsupported".
 */
export function isSupportedNodeVersion(): boolean | undefined {
  const major = getNodeMajorVersion();
  if (major === undefined) return undefined;
  return major >= MINIMUM_NODE_MAJOR;
}

/**
 * Emit a one-time warning when running on an unsupported Node.js version.
 * Never throws — analytics must not break the host app on import.
 */
export function checkNodeVersion(): void {
  try {
    const supported = isSupportedNodeVersion();
    if (supported === false && !hasWarned) {
      hasWarned = true;
      const current =
        typeof process !== 'undefined' && process.versions?.node
          ? process.versions.node
          : 'unknown';
      console.warn(
        `[analytics] Node.js ${current} detected — @stellar-explain/analytics requires Node.js >=${MINIMUM_NODE_MAJOR}. Please upgrade to avoid degraded delivery.`,
      );
    }
  } catch {
    // Intentionally silent — version detection must never break import.
  }
}

/** Reset the once-only warning flag (tests only). */
export function resetNodeVersionWarningForTests(): void {
  hasWarned = false;
}

// Run on package import — the actual Analytics #125 guarantee.
checkNodeVersion();
