// Closes #630: --network flag for mainnet/testnet selection.
import { DEFAULT_BASE_URL } from './env.js';

export type StellarNetwork = 'mainnet' | 'testnet';

export const NETWORK_URLS: Record<StellarNetwork, string> = {
  mainnet: 'https://stellar-explain-core.onrender.com',
  testnet: DEFAULT_BASE_URL,
};

export const DEFAULT_NETWORK: StellarNetwork = 'testnet';

/** Resolves a `--network` flag value to its backend base URL. */
export function resolveNetworkUrl(network: string = DEFAULT_NETWORK): string {
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error(`Unknown network "${network}". Expected "mainnet" or "testnet".`);
  }
  return NETWORK_URLS[network];
}
