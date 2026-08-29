/**
 * Browser detection from the user agent string.
 *
 * Returns a stable label ("Chrome", "Firefox", "Safari", "Edge") or
 * `undefined` when the user agent cannot be read or does not match a known
 * browser. Checks are ordered so that vendors whose user agents embed another
 * browser's token (e.g. Edge/Chrome containing "Chrome") are detected first.
 */

/**
 * Returns the detected browser, or `undefined` when it cannot be determined.
 */
export function getBrowser(): string | undefined {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return undefined;
  }

  const ua = navigator.userAgent;

  if (/Edg\//.test(ua)) return "Edge";
  if (/Firefox\//.test(ua)) return "Firefox";
  // Chrome before Safari: Chrome's user agent also contains the "Safari/" token.
  if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";

  return undefined;
}