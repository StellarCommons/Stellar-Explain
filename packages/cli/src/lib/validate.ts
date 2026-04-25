import { InvalidInputError } from "./errors";

/** Stellar transaction hashes are 64 hex characters. */
const TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

/** Stellar G-addresses are base32-encoded, start with G, and are 56 chars. */
const G_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export function isValidTxHash(hash: string): boolean {
  return TX_HASH_RE.test(hash);
}

export function isValidGAddress(address: string): boolean {
  return G_ADDRESS_RE.test(address);
}

/**
 * Asserts that `hash` is a valid Stellar transaction hash.
 * Throws InvalidInputError otherwise.
 */
export function assertTxHash(hash: string): void {
  if (!isValidTxHash(hash)) {
    throw new InvalidInputError(
      "hash",
      `"${hash}" is not a valid transaction hash (expected 64 hex chars)`
    );
  }
}

/**
 * Asserts that `address` is a valid Stellar G-address.
 * Throws InvalidInputError otherwise.
 */
export function assertGAddress(address: string): void {
  if (!isValidGAddress(address)) {
    throw new InvalidInputError(
      "address",
      `"${address}" is not a valid Stellar address (expected G + 55 base32 chars)`
    );
  }
}

export function sanitize(input: string): string {
  return input.trim().replace(/\s+/g, "");
}
