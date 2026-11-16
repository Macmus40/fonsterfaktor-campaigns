/**
 * Repository facade — modules import from here, not from sqlite/supabase drivers.
 * Default driver: supabase. Offline prototype: STORAGE_DRIVER=sqlite.
 */
import { getStorageDriver, missingSupabaseRequirements, supabaseConfigured } from "@/lib/config";

export type FoundationStatus = {
  driver: "supabase" | "sqlite";
  supabaseConfigured: boolean;
  missing: string[];
  sqlitePrototypeNote: string;
};

export function getFoundationStatus(): FoundationStatus {
  return {
    driver: getStorageDriver(),
    supabaseConfigured: supabaseConfigured(),
    missing: missingSupabaseRequirements(),
    sqlitePrototypeNote:
      "SQLite prototype commits remain in git history (pre-Supabase foundation). Prefer STORAGE_DRIVER=supabase with migrations applied.",
  };
}

export function requireSupabaseOrThrow() {
  const missing = missingSupabaseRequirements();
  if (missing.length) {
    const err = new Error(
      `Brak konfiguracji projektu Supabase. Ustaw: ${missing.join(", ")}. Utwórz projekt Supabase, uruchom supabase/migrations/20261116120000_init.sql, uzupełnij .env.local (zob. .env.example i docs/local-setup.md).`,
    );
    (err as Error & { code?: string }).code = "supabase_not_configured";
    throw err;
  }
}
