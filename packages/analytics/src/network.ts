/**
 * Network Information API helpers.
 *
 * `navigator.connection` (and its vendor-prefixed variants) is not available
 * in every browser, and does not exist at all in Node/SSR environments where
 * this package's test suite runs. Every lookup here is defensive: it never
 * throws and falls back to `undefined` when the API is unsupported.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */

/** The subset of the Network Information API's `NetworkInformation` this package reads. */
export interface ConnectionInfo {
  /**
   * Effective connection type, e.g. "4g", "3g", "2g", "slow-2g".
   * This is the browser's *estimated* effective type and may differ from
   * `type` (the underlying transport).
   */
  effectiveType?: string;
  /** Underlying connection type, e.g. "wifi", "cellular", "ethernet", "none". */
  type?: string;
  /** Downlink bandwidth estimate in megabits per second. */
  downlink?: number;
  /** Whether the user has requested reduced data usage. */
  saveData?: boolean;
}

interface NavigatorWithConnection {
  connection?: ConnectionInfo;
  mozConnection?: ConnectionInfo;
  webkitConnection?: ConnectionInfo;
}

/**
 * Reads the current connection info via `navigator.connection` (falling back
 * to the `moz`/`webkit` prefixed variants for older browsers).
 *
 * Returns `undefined` when:
 * - there is no global `navigator` (Node/SSR), or
 * - the browser does not implement the Network Information API.
 */
export function getConnectionInfo(): ConnectionInfo | undefined {
  if (typeof navigator === "undefined") return undefined;

  const nav = navigator as Navigator & NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  if (!connection) return undefined;

  return {
    effectiveType: connection.effectiveType,
    type: connection.type,
    downlink: connection.downlink,
    saveData: connection.saveData,
  };
}

/**
 * Convenience accessor for just the connection type, suitable for attaching
 * directly to an analytics event's properties.
 *
 * Prefers `effectiveType` (e.g. "4g") since it is more widely implemented
 * than `type` (e.g. "wifi"); falls back to `type` when `effectiveType` is
 * unavailable. Returns `undefined` when neither is available.
 */
export function getConnectionType(): string | undefined {
  const info = getConnectionInfo();
  return info?.effectiveType ?? info?.type;
}
