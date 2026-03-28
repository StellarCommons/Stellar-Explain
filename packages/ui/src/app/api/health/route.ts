import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      headers: { Accept: 'application/json' },
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Backend is unavailable' } },
      { status: 502 }
    );
  }
}