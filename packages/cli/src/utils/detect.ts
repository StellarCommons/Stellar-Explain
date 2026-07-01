/**
 * Detect the type of a raw user-provided input string.
 *
 * Returns one of:
 *   "transaction" – 64-character lowercase/uppercase hex string
 *   "account"     – Stellar public key starting with G (56 chars, base-32)
 *   "federation"  – federation address in the form "name*domain.tld"
 *   "unknown"     – does not match any known pattern
 */
export type DetectedInputType =
  | "transaction"
  | "account"
  | "federation"
  | "unknown";

/** 64-char hex: a valid Stellar transaction hash */
const TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

/** Stellar public key: starts with G, 56 total chars, base-32 alphabet */
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

/** Federation address: "name*domain.tld" – asterisk-separated, no spaces */
const FEDERATION_RE = /^[^*\s]+\*[^*\s]+\.[^*\s]+$/;

/**
 * Detect the type of a raw user-provided input string.
 */
export function detectInputType(input: string): DetectedInputType {
  if (!input) return "unknown";
  if (TX_HASH_RE.test(input)) return "transaction";
  if (STELLAR_ADDRESS_RE.test(input)) return "account";
  if (FEDERATION_RE.test(input)) return "federation";
  return "unknown";
}
