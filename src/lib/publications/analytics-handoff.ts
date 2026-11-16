import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { analyticsHandoffs } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import type { AnalyticsHandoff, ConfirmationKind, Publication } from "@/lib/types";

/**
 * Register post URL / platform id for the analytics module (agent 4).
 * Idempotent per publication + post identity.
 */
export function handoffToAnalytics(opts: {
  publication: Publication;
  confirmationKind: ConfirmationKind;
  postUrl?: string | null;
  platformPostId?: string | null;
}): AnalyticsHandoff {
  const db = getDb();
  const existing = db
    .select()
    .from(analyticsHandoffs)
    .where(eq(analyticsHandoffs.publicationId, opts.publication.id))
    .all();

  const postUrl = opts.postUrl ?? opts.publication.postUrl;
  const platformPostId =
    opts.platformPostId ?? opts.publication.externalId;

  const match = existing.find(
    (h) =>
      h.postUrl === (postUrl ?? null) &&
      h.platformPostId === (platformPostId ?? null),
  );
  if (match) {
    return {
      publicationId: match.publicationId,
      campaignId: match.campaignId,
      channel: match.channel,
      postUrl: match.postUrl,
      platformPostId: match.platformPostId,
      campaignLinkId: match.campaignLinkId,
      confirmationKind: match.confirmationKind as ConfirmationKind,
      handedOffAt: match.handedOffAt,
    };
  }

  const handedOffAt = nowIso();
  const payload: AnalyticsHandoff = {
    publicationId: opts.publication.id,
    campaignId: opts.publication.campaignId,
    channel: opts.publication.channel,
    postUrl: postUrl ?? null,
    platformPostId: platformPostId ?? null,
    campaignLinkId: opts.publication.campaignLinkId,
    confirmationKind: opts.confirmationKind,
    handedOffAt,
  };

  db.insert(analyticsHandoffs)
    .values({
      id: newId("ah"),
      publicationId: payload.publicationId,
      campaignId: payload.campaignId,
      channel: String(payload.channel),
      postUrl: payload.postUrl,
      platformPostId: payload.platformPostId,
      campaignLinkId: payload.campaignLinkId,
      confirmationKind: payload.confirmationKind,
      handedOffAt,
      payloadJson: JSON.stringify(payload),
    })
    .run();

  return payload;
}

export function listAnalyticsHandoffs(publicationId?: string) {
  const db = getDb();
  if (publicationId) {
    return db
      .select()
      .from(analyticsHandoffs)
      .where(eq(analyticsHandoffs.publicationId, publicationId))
      .all();
  }
  return db.select().from(analyticsHandoffs).all();
}
