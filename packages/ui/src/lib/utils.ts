/**
 * Utility functions for Stellar Explain UI.
 * Pure functions — no side effects, no API calls.
 */

/**
 * Shortens a Stellar address for display.
 * GABC...WXYZ
 */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Formats an XLM balance string for display.
 * Strips unnecessary trailing zeros but preserves meaningful decimals.
 * "35.6096767" → "35.61"
 * "0.0000002"  → "0.0000002"
 * "100.0000000" → "100"
 */
export function formatBalance(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;

  // If it's a very small number, show enough decimal places to be meaningful
  if (num > 0 && num < 0.001) {
    return num.toPrecision(2);
  }

  // Otherwise format with up to 2 decimal places, stripping trailing zeros
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a ledger timestamp for display.
 * "2026-02-18T08:02:05Z" → "2026-02-18 08:02:05 UTC"
 */
export function formatLedgerTime(iso: string): string {
  return iso.replace("T", " ").replace("Z", " UTC");
}