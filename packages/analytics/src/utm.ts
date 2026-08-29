/**
 * Analytics #57 — UTM parameter parsing.
 *
 * Extracts UTM campaign parameters from a URL string.
 * Returns `undefined` for each field that is absent or empty.
 */

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Parse UTM parameters from a URL string.
 * Returns an object with only the present, non-empty UTM fields.
 * Returns an empty object when the URL is malformed or has no UTM params.
 */
export function parseUtmParams(url: string): UtmParams {
  let searchParams: URLSearchParams;
  try {
    // Support both full URLs and query strings starting with "?"
    const parsed = url.startsWith("?") ? new URL(`https://x.com/${url}`) : new URL(url);
    searchParams = parsed.searchParams;
  } catch {
    return {};
  }

  const result: UtmParams = {};
  const keys: (keyof UtmParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null && value !== "") {
      result[key] = value;
    }
  }

  return result;
}
