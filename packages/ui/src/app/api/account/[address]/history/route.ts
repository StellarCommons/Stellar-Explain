// Fix: validate and clamp limit param in account history proxy (#1316)
import { NextRequest, NextResponse } from 'next/server';
const MIN_LIMIT = 1, MAX_LIMIT = 200, DEFAULT_LIMIT = 20;
export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw !== null ? parseInt(raw, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_LIMIT), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const address = encodeURIComponent(params.address);
  const base = process.env.CORE_API_URL || 'http://localhost:8080';
  const res = await fetch(base + '/account/' + address + '/history?limit=' + limit);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
