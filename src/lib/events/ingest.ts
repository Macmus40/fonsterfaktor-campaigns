import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { campaigns, conversionEvents, links } from "@/lib/db/schema";
import { stripContactFields } from "@/lib/events/sanitize";
import { newId, nowIso } from "@/lib/id";
import type { DinNextEventPayload, EventSource } from "@/lib/types";

export type IngestInput = {
  source: EventSource;
  eventType: string;
  occurredAt?: string;
  campaignId?: string | null;
  campaignSlug?: string | null;
  linkId?: string | null;
  publicationId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
};

export function resolveCampaignId(opts: {
  campaignId?: string | null;
  campaignSlug?: string | null;
}) {
  const db = getDb();
  if (opts.campaignId) return opts.campaignId;
  if (opts.campaignSlug) {
    const row = db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, opts.campaignSlug))
      .get();
    return row?.id ?? null;
  }
  return null;
}

function resolvePublicationFromLink(linkId?: string | null) {
  if (!linkId) return null;
  const db = getDb();
  const link = db.select().from(links).where(eq(links.id, linkId)).get();
  return link?.publicationId ?? null;
}

/**
 * Insert a conversion event. Replayed `idempotencyKey` returns the existing
 * row without double-counting.
 */
export function ingestConversionEvent(input: IngestInput) {
  const db = getDb();

  if (input.idempotencyKey) {
    const existing = db
      .select()
      .from(conversionEvents)
      .where(eq(conversionEvents.idempotencyKey, input.idempotencyKey))
      .get();
    if (existing) {
      return { eventId: existing.id, deduped: true as const };
    }
  }

  const campaignId = resolveCampaignId({
    campaignId: input.campaignId,
    campaignSlug: input.campaignSlug,
  });

  const publicationId =
    input.publicationId ?? resolvePublicationFromLink(input.linkId);

  const safePayload = stripContactFields(input.payload);

  const id = newId("evt");
  const createdAt = nowIso();

  try {
    db.insert(conversionEvents)
      .values({
        id,
        campaignId,
        linkId: input.linkId ?? null,
        publicationId,
        source: input.source,
        eventType: input.eventType,
        occurredAt: input.occurredAt ?? createdAt,
        payloadJson: JSON.stringify(safePayload),
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt,
      })
      .run();
  } catch (err) {
    if (input.idempotencyKey) {
      const existing = db
        .select()
        .from(conversionEvents)
        .where(eq(conversionEvents.idempotencyKey, input.idempotencyKey))
        .get();
      if (existing) {
        return { eventId: existing.id, deduped: true as const };
      }
    }
    throw err;
  }

  return { eventId: id, deduped: false as const };
}

export function ingestDinNextEvent(body: DinNextEventPayload) {
  const allowed = new Set(["price_view", "inquiry_submitted"]);
  if (!allowed.has(body.eventType)) {
    throw new Error(`unsupported_event_type:${body.eventType}`);
  }

  return ingestConversionEvent({
    source: "din_next",
    eventType: body.eventType,
    occurredAt: body.occurredAt,
    campaignId: body.campaignId,
    campaignSlug: body.campaignSlug,
    linkId: body.linkId,
    publicationId: body.publicationId,
    payload: {
      ...stripContactFields(body.payload),
      ...(body.contentVariantId
        ? { contentVariantId: body.contentVariantId }
        : {}),
    },
    idempotencyKey: body.idempotencyKey,
  });
}
