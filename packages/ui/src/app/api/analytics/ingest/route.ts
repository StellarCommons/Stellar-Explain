// Fix: add validation and size limit to analytics ingest proxy (#1318)
import { NextRequest, NextResponse } from 'next/server';
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
  try { JSON.parse(body); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
