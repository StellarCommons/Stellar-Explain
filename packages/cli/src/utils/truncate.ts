// Closes #629: truncate long Stellar addresses in terminal output by default.

const STELLAR_ADDRESS_LENGTH = 56;
const PREFIX_LENGTH = 6;
const SUFFIX_LENGTH = 6;

/**
 * Truncates a full Stellar address to `GABC…WXYZ` format (first 6 + last 6
 * characters). Non-address-shaped strings are returned unchanged.
 */
export function truncateAddress(address: string): string {
  if (address.length < STELLAR_ADDRESS_LENGTH) {
    return address;
  }
  const prefix = address.slice(0, PREFIX_LENGTH);
  const suffix = address.slice(-SUFFIX_LENGTH);
  return `${prefix}…${suffix}`;
}
