export type StorageDriver = "supabase" | "sqlite";

export function getStorageDriver(): StorageDriver {
  const raw = (process.env.STORAGE_DRIVER ?? "supabase").toLowerCase();
  return raw === "sqlite" ? "sqlite" : "supabase";
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
  return { url, anonKey, serviceRoleKey };
}

export function supabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export function missingSupabaseRequirements(): string[] {
  const missing: string[] = [];
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY (server jobs / seed / ingest upserts)");
  return missing;
}

export function getAppOrigin() {
  return (process.env.APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}
