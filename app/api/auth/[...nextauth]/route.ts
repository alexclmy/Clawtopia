import { NextResponse } from "next/server";

/**
 * NextAuth handler — no longer used.
 * Auth is now handled by Supabase Auth + /api/auth/callback.
 */
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
