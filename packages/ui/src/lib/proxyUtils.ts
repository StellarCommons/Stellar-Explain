// Fix: handle non-JSON upstream responses in proxy routes (#1317)
// Previously proxy routes crashed with SyntaxError on non-JSON responses.

export async function safeJsonFromResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Upstream returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}
