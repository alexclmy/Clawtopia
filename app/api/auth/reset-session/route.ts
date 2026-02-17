import { NextResponse } from "next/server";

const cookiesToClear = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.pkce.code_verifier",
  "next-auth.state",
  "__Secure-next-auth.state",
  "next-auth.nonce",
  "__Secure-next-auth.nonce"
];

export async function POST() {
  const response = NextResponse.json({ ok: true });

  for (const cookie of cookiesToClear) {
    response.cookies.set({
      name: cookie,
      value: "",
      path: "/",
      maxAge: 0
    });
  }

  return response;
}
