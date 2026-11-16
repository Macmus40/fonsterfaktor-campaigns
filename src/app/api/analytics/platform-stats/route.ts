import { NextResponse } from "next/server";
import {
  listPlatformStats,
  tryFetchVerifiedMetaInsights,
  upsertPlatformStat,
} from "@/lib/analytics/platform-stats";
import { getDb } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  const campaignSlug = url.searchParams.get("campaignSlug");

  let id = campaignId;
  if (!id && campaignSlug) {
    const row = getDb()
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, campaignSlug))
      .get();
    id = row?.id ?? null;
  }
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "campaignId_or_campaignSlug_required" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, stats: listPlatformStats(id) });
}

export async function POST(request: Request) {
  let body: {
    campaignId?: string;
    publicationId?: string | null;
    channel?: string;
    metric?: string;
    value?: number;
    currency?: string;
    periodStart?: string;
    periodEnd?: string;
    dataSource?: string;
    verified?: boolean;
    notes?: string;
    tryMetaPull?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.tryMetaPull && body.campaignId) {
    const meta = await tryFetchVerifiedMetaInsights({
      campaignId: body.campaignId,
      publicationId: body.publicationId ?? undefined,
    });
    return NextResponse.json({ ok: meta.ok, meta });
  }

  if (
    !body.campaignId ||
    !body.channel ||
    !body.metric ||
    typeof body.value !== "number"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "campaignId_channel_metric_value_required",
      },
      { status: 400 },
    );
  }

  const row = upsertPlatformStat({
    campaignId: body.campaignId,
    publicationId: body.publicationId,
    channel: body.channel,
    metric: body.metric,
    value: body.value,
    currency: body.currency,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    dataSource: body.dataSource ?? "manual",
    verified: body.verified ?? false,
    notes: body.notes ?? "Ręczny wpis statystyk platformy",
  });

  return NextResponse.json({ ok: true, stat: row });
}
