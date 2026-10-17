// Fix: fetchTransaction must use absolute URL on the server (#1319)
// Relative /api URLs fail during SSR because there is no base URL.

const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000'
    : '';

export async function fetchTransaction(hash: string) {
  const url = `${API_BASE}/api/tx/${encodeURIComponent(hash)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch transaction: ${res.status}`);
  return res.json();
}
