import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
export const dynamic = 'force-dynamic';
