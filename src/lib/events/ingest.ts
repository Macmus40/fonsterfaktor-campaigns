import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { campaigns, conversionEvents } from "@/lib/db/schema";
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

  const id = newId("evt");
  const createdAt = nowIso();
  db.insert(conversionEvents)
    .values({
      id,
      campaignId,
      linkId: input.linkId ?? null,
      publicationId: input.publicationId ?? null,
      source: input.source,
      eventType: input.eventType,
      occurredAt: input.occurredAt ?? createdAt,
      payloadJson: JSON.stringify(input.payload ?? {}),
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt,
    })
    .run();

  return { eventId: id, deduped: false as const };
}

export function ingestDinNextEvent(body: DinNextEventPayload) {
  return ingestConversionEvent({
    source: "din_next",
    eventType: body.eventType,
    occurredAt: body.occurredAt,
    campaignId: body.campaignId,
    campaignSlug: body.campaignSlug,
    linkId: body.linkId,
    publicationId: body.publicationId,
    payload: body.payload,
    idempotencyKey: body.idempotencyKey,
  });
}
