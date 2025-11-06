// app/ping/route.tsx
// Purpose: Lightweight connectivity check used by isOnline() probe.
// Notes: Any successful response counts as “online”; content is irrelevant.

import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
export const dynamic = "force-dynamic";
