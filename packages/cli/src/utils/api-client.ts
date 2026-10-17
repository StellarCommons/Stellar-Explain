// Fix: unwrap API responses correctly; backend returns bare JSON, not {data} (#1327)
// CLI was accessing response.data which was always undefined.

export async function fetchFromApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  // Backend returns bare JSON — do NOT unwrap a .data property
  return res.json() as Promise<T>;
}
