import "server-only";
import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerClient() {
  const cookieStore = cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Can't set cookies in Server Components — middleware handles refresh
          }
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Swallow — handled by middleware
          }
        }
      }
    }
  );
}
