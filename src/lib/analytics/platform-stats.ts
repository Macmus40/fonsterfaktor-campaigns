import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { platformStats } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import type { PlatformDataSource, PlatformStatMetric } from "@/lib/types";

export type UpsertPlatformStatInput = {
  campaignId: string;
  publicationId?: string | null;
  channel: string;
  metric: PlatformStatMetric | string;
  value: number;
  currency?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dataSource: PlatformDataSource | string;
  verified?: boolean;
  notes?: string | null;
};

export function upsertPlatformStat(input: UpsertPlatformStatInput) {
  const db = getDb();
  const ts = nowIso();
  const id = newId("pst");

  db.insert(platformStats)
    .values({
      id,
      campaignId: input.campaignId,
      publicationId: input.publicationId ?? null,
      channel: input.channel,
      metric: input.metric,
      value: input.value,
      currency: input.currency ?? (input.metric === "spend" ? "SEK" : null),
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      dataSource: input.dataSource,
      verified: Boolean(input.verified),
      notes: input.notes ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return db.select().from(platformStats).where(eq(platformStats.id, id)).get()!;
}

export function listPlatformStats(campaignId: string) {
  const db = getDb();
  return db
    .select()
    .from(platformStats)
    .where(eq(platformStats.campaignId, campaignId))
    .all();
}

/**
 * Optional Meta Insights pull — only when token + ad account are configured
 * AND the caller marks metrics as explicitly verified. Without credentials,
 * returns a clear "not available" status (manual entry remains the default).
 */
export async function tryFetchVerifiedMetaInsights(_opts: {
  campaignId: string;
  publicationId?: string;
  externalAdId?: string;
}): Promise<
  | { ok: true; imported: number }
  | { ok: false; reason: string }
> {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccount = process.env.META_AD_ACCOUNT_ID;
  if (!token || !adAccount) {
    return {
      ok: false,
      reason:
        "Meta API niedostępne — brak META_ACCESS_TOKEN / META_AD_ACCOUNT_ID. Wprowadź zasięg i wydatki ręcznie (dataSource=manual).",
    };
  }

  // Intentionally minimal: without a live test account we do not invent numbers.
  // When credentials exist, a future agent can map Insights fields → platform_stats
  // with verified=true and dataSource=meta_api.
  return {
    ok: false,
    reason:
      "Token obecny, ale mapowanie Insights → platform_stats wymaga jawnie zweryfikowanego externalAdId i konta testowego. Użyj ręcznego wpisu do czasu weryfikacji.",
  };
}
