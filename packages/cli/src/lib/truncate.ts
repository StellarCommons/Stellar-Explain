export function truncateAddress(address: string, full = false): string {
  if (full || address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}