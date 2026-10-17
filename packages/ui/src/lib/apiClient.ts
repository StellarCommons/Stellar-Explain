// Fix: encode path params in API client and proxy routes (#1315)
const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000'
    : '';
export async function fetchTx(hash: string) {
  const res = await fetch(`${API_BASE}/api/tx/${encodeURIComponent(hash)}`);
  if (!res.ok) throw new Error(`fetchTx failed: ${res.status}`);
  return res.json();
}
export async function fetchAccount(address: string) {
  const res = await fetch(`${API_BASE}/api/account/${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error(`fetchAccount failed: ${res.status}`);
  return res.json();
}
