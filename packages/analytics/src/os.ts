/**
 * Operating system detection from the user agent string.
 *
 * Returns a stable label ("Windows", "macOS", "Linux", "iOS", "Android") or
 * `undefined` when the user agent cannot be read or does not match a known
 * OS. Checks are ordered so overlapping user agents resolve correctly
 * (e.g. iPadOS user agents also contain "Macintosh", and Android user agents
 * contain "Linux").
 */

/**
 * Returns the detected operating system, or `undefined` when it cannot be
 * determined.
 */
export function getOS(): string | undefined {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return undefined;
  }

  const ua = navigator.userAgent;

  if (/Windows/i.test(ua)) return "Windows";
  // iOS before macOS: iPadOS/iOS user agents also contain "Mac OS X".
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  // Android before Linux: Android user agents also contain "Linux".
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";

  return undefined;
}