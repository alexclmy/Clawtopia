import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

const DEMO_COOKIE = "clawtopia_demo";

export interface AuthSession {
  email: string;
  name: string;
}

const isSupabaseAuthConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const isDemoEnabled = () =>
  process.env.ENABLE_DEMO_AUTH === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_AUTH !== "false");

/**
 * Unified session getter — checks Supabase Auth first, then falls back to the
 * dev-only demo cookie. Replaces `getServerSession(authOptions)` everywhere.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  // 1. Supabase Auth (primary — production)
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = createServerClient();
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (!error && user?.email) {
        const meta = user.user_metadata as Record<string, string> | undefined;
        return {
          email: user.email,
          name: meta?.full_name || meta?.name || user.email.split("@")[0]
        };
      }
    } catch {
      // Supabase unavailable — fall through to demo
    }
  }

  // 2. Demo cookie (dev / staging only)
  if (isDemoEnabled()) {
    const raw = cookies().get(DEMO_COOKIE)?.value;
    if (raw) {
      try {
        return JSON.parse(raw) as AuthSession;
      } catch {
        // Malformed cookie — ignore
      }
    }
  }

  return null;
}
