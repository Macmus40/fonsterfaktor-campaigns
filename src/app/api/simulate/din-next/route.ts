import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { campaigns, links } from "@/lib/db/schema";
import { ingestDinNextEvent } from "@/lib/events/ingest";

export const runtime = "nodejs";

/**
 * Local DIN Next simulator. Posts sample price_view / inquiry_submitted events
 * attributed to a campaign + optional publication/link (variant).
 */
export async function POST(request: Request) {
  let body: {
    campaignSlug?: string;
    linkId?: string;
    publicationId?: string;
    count?: number;
    includeInquiry?: boolean;
    inquiryCount?: number;
    seed?: number | string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const slug = body.campaignSlug ?? "svart-skjutparti";
  const count = Math.min(Math.max(body.count ?? 2, 0), 50);
  const inquiryCount = Math.min(
    Math.max(
      body.inquiryCount ?? (body.includeInquiry === false ? 0 : 1),
      0,
    ),
    20,
  );
  const seed = String(body.seed ?? Date.now());

  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .get();

  if (!campaign) {
    return NextResponse.json(
      {
        ok: false,
        error: "campaign_not_found",
        hint: "Run npm run seed:demo first",
      },
      { status: 404 },
    );
  }

  let link =
    (body.linkId
      ? db.select().from(links).where(eq(links.id, body.linkId)).get()
      : null) ?? null;

  if (!link && body.publicationId) {
    link =
      db
        .select()
        .from(links)
        .where(eq(links.publicationId, body.publicationId))
        .get() ?? null;
  }

  if (!link) {
    link =
      db.select().from(links).where(eq(links.campaignId, campaign.id)).get() ??
      null;
  }

  const created: Array<{ eventId: string; eventType: string; deduped: boolean }> =
    [];

  for (let i = 0; i < count; i++) {
    const price = 35000 + i * 1200;
    const result = ingestDinNextEvent({
      eventType: "price_view",
      campaignSlug: slug,
      campaignId: campaign.id,
      linkId: link?.id,
      publicationId: link?.publicationId ?? body.publicationId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `sim:price_view:${seed}:${link?.id ?? "none"}:${i}`,
      payload: {
        product: campaign.product,
        configuratorUrl: campaign.destinationUrl,
        priceSek: price,
        simulator: true,
        index: i,
      },
    });
    created.push({
      eventId: result.eventId,
      eventType: "price_view",
      deduped: result.deduped,
    });
  }

  for (let i = 0; i < inquiryCount; i++) {
    const result = ingestDinNextEvent({
      eventType: "inquiry_submitted",
      campaignSlug: slug,
      campaignId: campaign.id,
      linkId: link?.id,
      publicationId: link?.publicationId ?? body.publicationId,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `sim:inquiry_submitted:${seed}:${link?.id ?? "none"}:${i}`,
      payload: {
        product: campaign.product,
        configuratorUrl: campaign.destinationUrl,
        inquiryId: `sim-inq-${seed}-${i}`,
        simulator: true,
      },
    });
    created.push({
      eventId: result.eventId,
      eventType: "inquiry_submitted",
      deduped: result.deduped,
    });
  }

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    campaignSlug: slug,
    linkId: link?.id ?? null,
    publicationId: link?.publicationId ?? null,
    events: created,
  });
}
