// Closes #628: --full-address flag to disable address truncation in text output.
import { truncateAddress } from '../utils/truncate.js';

export interface AddressDisplayOptions {
  fullAddress?: boolean;
}

/**
 * Formats a Stellar address for text output, truncating to `GABC…WXYZ`
 * unless `--full-address` was passed.
 */
export function displayAddress(address: string, opts: AddressDisplayOptions = {}): string {
  return opts.fullAddress ? address : truncateAddress(address);
}
