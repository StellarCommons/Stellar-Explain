// Fix: handleResponse tolerates non-JSON error bodies (#1314)
export async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = `Request failed with status ${res.status}`;
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const err = await res.json();
      message = err?.message || err?.error || message;
    } else {
      const text = await res.text();
      if (text) message = text.slice(0, 200);
    }
  } catch { /* ignore */ }
  throw new Error(message);
}
