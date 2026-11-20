// Validates an analytics event and forwards it to the backend (#1318)
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const MAX_BODY_BYTES = 4096;

export async function POST(req: NextRequest) {
  const cl = req.headers.get('content-length');
  if (cl && parseInt(cl, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  let event: unknown;
  try { event = JSON.parse(body); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const e = event as { name?: unknown; timestamp?: unknown } | null;
  if (typeof e !== 'object' || e === null || typeof e.name !== 'string' || !e.name || e.timestamp === undefined) {
    return NextResponse.json({ error: 'Event needs a name and timestamp' }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 202 : 502 });
  } catch {
    return NextResponse.json({ error: 'Backend is unavailable' }, { status: 502 });
  }
}
