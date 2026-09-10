/**
 * Minimum supported major version of Node.js for @stellar-explain/analytics.
 */
export const MIN_NODE_VERSION = 18;

/**
 * Extracts and returns the current Node.js major version, or null if not running in a Node.js environment.
 */
export function getNodeMajorVersion(): number | null {
  if (
    typeof process === "undefined" ||
    !process ||
    !process.versions ||
    typeof process.versions.node !== "string"
  ) {
    return null;
  }
  const match = process.versions.node.match(/^(\d+)/);
  if (!match) {
    return null;
  }
  const major = parseInt(match[1], 10);
  return Number.isNaN(major) ? null : major;
}

/**
 * Checks whether the current runtime environment meets the minimum Node.js major version requirement.
 * In non-Node.js environments (e.g. browser, web workers), this safely returns true.
 */
export function isSupportedNodeVersion(minVersion: number = MIN_NODE_VERSION): boolean {
  const major = getNodeMajorVersion();
  if (major === null) {
    return true; // Not running in Node.js runtime
  }
  return major >= minVersion;
}

/**
 * Emits a warning to console.warn if running on an unsupported Node.js version (< v18).
 * Returns true if supported or non-Node environment, false if unsupported and warning was emitted.
 */
export function warnIfUnsupportedNodeVersion(minVersion: number = MIN_NODE_VERSION): boolean {
  const major = getNodeMajorVersion();
  if (major !== null && major < minVersion) {
    const currentVersion = process.versions?.node ?? "unknown";
    console.warn(
      `[@stellar-explain/analytics] Node.js version v${currentVersion} is not supported. ` +
        `The minimum required version is v${minVersion}+. Some features may not work as expected.`
    );
    return false;
  }
  return true;
}
