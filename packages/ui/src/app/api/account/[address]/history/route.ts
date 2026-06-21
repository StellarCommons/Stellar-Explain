import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(req.url);

  const query = new URLSearchParams();
  const limit = searchParams.get('limit');
  const cursor = searchParams.get('cursor');
  if (limit) query.set('limit', limit);
  if (cursor) query.set('cursor', cursor);

  const qs = query.toString();
  const url = `${API_URL}/account/${address}/history${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Backend is unavailable' } },
      { status: 502 }
    );
  }
}
