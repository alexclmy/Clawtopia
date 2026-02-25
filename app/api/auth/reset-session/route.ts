import { NextResponse } from "next/server";

/** Clear all auth cookies — Supabase session + legacy NextAuth + demo */
export async function POST() {
  const response = NextResponse.json({ ok: true });

  const cookiesToClear = [
    // Supabase session tokens (project-specific prefix pattern)
    "sb-access-token",
    "sb-refresh-token",
    // Legacy NextAuth cookies (kept for transition period)
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    // Demo cookie
    "clawtopia_demo"
  ];

  for (const name of cookiesToClear) {
    response.cookies.set({ name, value: "", path: "/", maxAge: 0 });
  }

  return response;
}
