export type Network = "mainnet" | "testnet";

const NETWORK_URLS: Record<Network, string> = {
  mainnet: "https://stellar-explain.mainnet.example.com",
  testnet: "https://stellar-explain.testnet.example.com",
};

export function resolveNetworkUrl(network?: Network, flagUrl?: string): string {
  if (flagUrl) return flagUrl;
  return NETWORK_URLS[network ?? "mainnet"];
}