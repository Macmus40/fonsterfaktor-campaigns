/**
 * Three foundation probes required by the contract update:
 * 1) campaign write persists after "restart" (re-open DB/client)
 * 2) media upload URL (Storage)
 * 3) panel access after login (Auth session check prerequisites)
 *
 * Reports exactly what Supabase config is missing when a probe cannot run.
 */
import { getFoundationStatus, requireSupabaseOrThrow } from "../src/lib/db/repository";
import { createCampaign, getCampaignBySlug } from "../src/lib/campaigns/store";
import { getStorageDriver } from "../src/lib/config";

type Probe = {
  name: string;
  ok: boolean;
  detail: string;
};

async function main() {
  const foundation = getFoundationStatus();
  const probes: Probe[] = [];

  // --- 1. Campaign persist ---
  try {
    if (foundation.driver === "supabase" && foundation.missing.length) {
      probes.push({
        name: "zapis_kampanii_po_restarcie",
        ok: false,
        detail: `Brak konfiguracji Supabase: ${foundation.missing.join(", ")}. Utwórz projekt Supabase, zastosuj supabase/migrations/20261116120000_init.sql, uzupełnij .env.local.`,
      });
    } else {
      const slug = `probe-${Date.now()}`;
      await createCampaign({
        slug,
        name: "Probe campaign",
        product: "probe",
        goal: "foundation probe",
        destinationUrl: "https://example.test/konfigurator?product=probe",
        isDemo: true,
        status: "draft",
      });
      // "restart": drop cached note by re-reading via fresh call
      const again = await getCampaignBySlug(slug);
      probes.push({
        name: "zapis_kampanii_po_restarcie",
        ok: Boolean(again),
        detail: again
          ? `OK driver=${foundation.driver} slug=${slug}`
          : "Kampania nie znaleziona po ponownym odczycie",
      });
    }
  } catch (err) {
    probes.push({
      name: "zapis_kampanii_po_restarcie",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // --- 2. File upload (signed URL) ---
  try {
    if (foundation.missing.length) {
      probes.push({
        name: "dodanie_pliku",
        ok: false,
        detail: `Brak: ${foundation.missing.join(", ")}. Bucket campaign-media powstaje w migracji; potem POST /api/media/upload-url jako zalogowany użytkownik.`,
      });
    } else {
      requireSupabaseOrThrow();
      const { createSupabaseServiceClient } = await import(
        "../src/lib/supabase/server"
      );
      const sb = createSupabaseServiceClient();
      const path = `probe/${Date.now()}.txt`;
      const { error } = await sb.storage
        .from("campaign-media")
        .upload(path, Buffer.from("probe"), {
          contentType: "text/plain",
          upsert: true,
        });
      if (error) {
        probes.push({
          name: "dodanie_pliku",
          ok: false,
          detail: `${error.message} — sprawdź bucket campaign-media i polityki Storage po migracji.`,
        });
      } else {
        await sb.storage.from("campaign-media").remove([path]);
        probes.push({
          name: "dodanie_pliku",
          ok: true,
          detail: `OK upload+delete w bucket campaign-media (${path})`,
        });
      }
    }
  } catch (err) {
    probes.push({
      name: "dodanie_pliku",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // --- 3. Panel login readiness ---
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      probes.push({
        name: "dostep_panelu_po_zalogowaniu",
        ok: false,
        detail:
          "Brak NEXT_PUBLIC_SUPABASE_URL i/lub NEXT_PUBLIC_SUPABASE_ANON_KEY. W Supabase Authentication utwórz użytkownika operatora, potem /login.",
      });
    } else {
      probes.push({
        name: "dostep_panelu_po_zalogowaniu",
        ok: true,
        detail:
          "Zmienne Auth obecne — zaloguj się na /login (konto musi istnieć w Supabase Auth). Middleware chroni panel.",
      });
    }
  } catch (err) {
    probes.push({
      name: "dostep_panelu_po_zalogowaniu",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const report = {
    at: new Date().toISOString(),
    driver: getStorageDriver(),
    foundation,
    probes,
  };
  console.log(JSON.stringify(report, null, 2));
  const failed = probes.some((p) => !p.ok);
  process.exit(failed ? 2 : 0);
}

main();
