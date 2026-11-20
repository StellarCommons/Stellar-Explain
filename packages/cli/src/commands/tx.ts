// Fix: use shared commands module; remove duplicated inline logic (#1329)
// index.ts had inline tx/account/batch logic duplicating the commands/ modules.
// This command module is the single source of truth for the tx command.

import { getNetworkUrl } from '../network-urls';

export async function txCommand(hash: string, opts: { network?: string } = {}) {
  const network = opts.network || 'mainnet';
  const base = getNetworkUrl(network);
  const res = await fetch(`${base}/tx/${encodeURIComponent(hash)}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
