import { NextResponse } from 'next/server';

// Returns current server build/version identifier. Client polls this to detect
// deploys and trigger service-worker update / page reload.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now());

export async function GET() {
  return NextResponse.json(
    { version: BUILD_ID, serverTime: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}
