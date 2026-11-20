import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const MIN_LIMIT = 1, MAX_LIMIT = 200, DEFAULT_LIMIT = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw !== null ? parseInt(raw, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_LIMIT), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const query = new URLSearchParams({ limit: String(limit) });
  const cursor = req.nextUrl.searchParams.get('cursor');
  if (cursor) query.set('cursor', cursor);

  try {
    const res = await fetch(
      `${API_URL}/account/${encodeURIComponent(address)}/history?${query.toString()}`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Backend is unavailable' } },
      { status: 502 }
    );
  }
}
