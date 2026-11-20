import { NextResponse } from 'next/server';
import { safeJsonFromResponse } from '@/lib/proxyUtils';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const HASH_RE = /^[0-9a-fA-F]{64}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  if (!HASH_RE.test(hash)) {
    return NextResponse.json(
      { error: { code: 'INVALID_HASH', message: 'Transaction hash must be 64 hex characters' } },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/tx/${encodeURIComponent(hash)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await safeJsonFromResponse(res);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Backend is unavailable' } },
      { status: 502 }
    );
  }
}
