import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEMO_COOKIE = "clawtopia_demo";

const isDemoEnabled = () =>
  process.env.ENABLE_DEMO_AUTH === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_AUTH !== "false");

/** POST /api/auth/demo — set demo session cookie (dev only) */
export async function POST(request: NextRequest) {
  if (!isDemoEnabled()) {
    return NextResponse.json({ error: "Demo auth is not enabled." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : email.split("@")[0];

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  cookies().set(DEMO_COOKIE, JSON.stringify({ email, name }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/auth/demo — clear demo session cookie */
export async function DELETE() {
  cookies().set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
