/**
 * Auth configuration flags — checked at runtime by server components and login page.
 *
 * Primary auth: Supabase with Google OAuth
 *   Requires: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   Enable Google provider in Supabase Dashboard → Authentication → Providers → Google
 *   Set authorised redirect URI: <your-domain>/api/auth/callback
 *
 * Demo auth (dev / staging only):
 *   Set ENABLE_DEMO_AUTH=true (or leave unset in non-production)
 */

export const isGoogleAuthConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const demoEnv = process.env.ENABLE_DEMO_AUTH?.trim().toLowerCase();
export const isDemoAuthEnabled =
  demoEnv === "true" ||
  (demoEnv !== "false" && process.env.NODE_ENV !== "production") ||
  !isGoogleAuthConfigured;
