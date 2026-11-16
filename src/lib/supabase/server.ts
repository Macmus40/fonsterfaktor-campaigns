import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig, missingSupabaseRequirements } from "@/lib/config";

export function assertSupabaseEnv() {
  const missing = missingSupabaseRequirements().filter(
    (m) => !m.includes("SERVICE_ROLE"),
  );
  // Browser/session needs URL + anon; service role checked separately for admin ops
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error(
      `supabase_not_configured: missing ${missingSupabaseRequirements().join(", ")}`,
    );
  }
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error(
      `supabase_not_configured: missing ${missingSupabaseRequirements().join(", ")}`,
    );
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* called from a Server Component — ignore */
        }
      },
    },
  });
}

/** Service-role client for cron, seed, and trusted ingest (never expose to browser). */
export function createSupabaseServiceClient(): SupabaseClient {
  const { url, serviceRoleKey, anonKey } = getSupabaseConfig();
  if (!url) {
    throw new Error("supabase_not_configured: missing NEXT_PUBLIC_SUPABASE_URL");
  }
  const key = serviceRoleKey ?? anonKey;
  if (!key) {
    throw new Error(
      "supabase_not_configured: missing SUPABASE_SERVICE_ROLE_KEY (or anon fallback)",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
