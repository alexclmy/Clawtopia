import "server-only";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

interface SupabaseRequestOptions {
  table: string;
  method?: HttpMethod;
  query?: URLSearchParams;
  body?: unknown;
  prefer?: string;
}

export async function supabaseRequest<T>({
  table,
  method = "GET",
  query,
  body,
  prefer
}: SupabaseRequestOptions): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const url = `${supabaseUrl}/rest/v1/${table}${query ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase request failed (${method} ${table}) [${response.status}]: ${errorText.slice(0, 240)}`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null as T;
  }

  return (await response.json()) as T;
}
