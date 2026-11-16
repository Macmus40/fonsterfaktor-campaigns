import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  contentVariants,
  materials,
  publicationAttempts,
  publications,
} from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import { mintCampaignLink } from "@/lib/links/mint";
import { stockholmLocalToUtcIso } from "@/lib/time/stockholm";
import { rowToAttempt, rowToPublication } from "./mappers";
import type {
  PublishMode,
  Publication,
  PublicationAttempt,
  PublicationChannel,
} from "@/lib/types";

export type SchedulePublicationInput = {
  campaignId: string;
  contentVariantId: string;
  channel: PublicationChannel;
  /** Stockholm local `YYYY-MM-DDTHH:mm` or UTC ISO. */
  scheduledAtLocal?: string | null;
  scheduledAtUtc?: string | null;
  publishMode: PublishMode;
  materialIds?: string[];
};

function resolveScheduledAt(input: SchedulePublicationInput): string | null {
  if (input.scheduledAtUtc) return new Date(input.scheduledAtUtc).toISOString();
  if (input.scheduledAtLocal) {
    return stockholmLocalToUtcIso(input.scheduledAtLocal);
  }
  return null;
}

export function listPublications(campaignId?: string): Publication[] {
  const db = getDb();
  const rows = campaignId
    ? db
        .select()
        .from(publications)
        .where(eq(publications.campaignId, campaignId))
        .orderBy(desc(publications.scheduledAt))
        .all()
    : db
        .select()
        .from(publications)
        .orderBy(desc(publications.scheduledAt))
        .all();
  return rows.map(rowToPublication);
}

export function getPublication(id: string): Publication | null {
  const row = getDb()
    .select()
    .from(publications)
    .where(eq(publications.id, id))
    .get();
  return row ? rowToPublication(row) : null;
}

export function listAttempts(publicationId: string): PublicationAttempt[] {
  return getDb()
    .select()
    .from(publicationAttempts)
    .where(eq(publicationAttempts.publicationId, publicationId))
    .orderBy(desc(publicationAttempts.createdAt))
    .all()
    .map(rowToAttempt);
}

export function schedulePublication(
  input: SchedulePublicationInput,
): Publication {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId))
    .get();
  if (!campaign) throw new Error("Campaign not found");

  const variant = db
    .select()
    .from(contentVariants)
    .where(
      and(
        eq(contentVariants.id, input.contentVariantId),
        eq(contentVariants.campaignId, input.campaignId),
      ),
    )
    .get();
  if (!variant) throw new Error("Content variant not found for campaign");
  if (variant.status !== "approved") {
    throw new Error(
      "Only approved content variants can be scheduled for publish",
    );
  }

  const materialIds =
    input.materialIds && input.materialIds.length > 0
      ? input.materialIds
      : db
          .select()
          .from(materials)
          .where(eq(materials.campaignId, input.campaignId))
          .all()
          .map((m) => m.id);

  const scheduledAt = resolveScheduledAt(input);
  const ts = nowIso();
  const id = newId("pub");

  db.insert(publications)
    .values({
      id,
      campaignId: input.campaignId,
      channel: input.channel,
      externalId: null,
      contentVariantId: variant.id,
      materialIdsJson: JSON.stringify(materialIds),
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
      publishMode: input.publishMode,
      confirmationKind: null,
      postUrl: null,
      campaignLinkId: null,
      lastAttemptId: null,
      publishedAt: null,
      endedAt: null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  const link = mintCampaignLink({
    campaignId: input.campaignId,
    publicationId: id,
    channel: input.channel,
    variantLabel: variant.label,
  });

  db.update(publications)
    .set({ campaignLinkId: link.id, updatedAt: nowIso() })
    .where(eq(publications.id, id))
    .run();

  const pub = getPublication(id);
  if (!pub) throw new Error("Failed to load scheduled publication");
  return pub;
}

export function registerManualPostUrl(
  publicationId: string,
  postUrl: string,
): Publication {
  const pub = getPublication(publicationId);
  if (!pub) throw new Error("Publication not found");
  if (pub.publishMode !== "manual") {
    throw new Error("Manual post URL only for manual publish mode");
  }

  const ts = nowIso();
  getDb()
    .update(publications)
    .set({
      postUrl,
      status: "published",
      confirmationKind: "manual",
      publishedAt: ts,
      updatedAt: ts,
      externalId: postUrl,
    })
    .where(eq(publications.id, publicationId))
    .run();

  const updated = getPublication(publicationId);
  if (!updated) throw new Error("Update failed");
  return updated;
}

export function getCampaignBundle(campaignId: string) {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .get();
  if (!campaign) return null;
  const variants = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaignId))
    .all();
  const mats = db
    .select()
    .from(materials)
    .where(eq(materials.campaignId, campaignId))
    .all();
  const pubs = listPublications(campaignId);
  return { campaign, variants, materials: mats, publications: pubs };
}
