// Fix: give mainnet and testnet distinct backend URLs (#1333)
// Previously both networks pointed to the same URL.

export const NETWORK_URLS: Record<string, string> = {
  mainnet: process.env.MAINNET_API_URL || 'https://stellar-explain-core.onrender.com',
  testnet: process.env.TESTNET_API_URL || 'https://stellar-explain-testnet.onrender.com',
};

export function getNetworkUrl(network: string): string {
  const url = NETWORK_URLS[network];
  if (!url) throw new Error(`Unknown network: ${network}. Use 'mainnet' or 'testnet'.`);
  return url;
}
