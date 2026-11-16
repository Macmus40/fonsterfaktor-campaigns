import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { campaigns, contentVariants, links, publications } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";

export type MintLinkInput = {
  campaignId: string;
  publicationId: string;
  label?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  destinationUrl?: string | null;
};

/**
 * Every publication gets its own tagged link pointing at the campaign
 * konfigurator destination (product params preserved on that URL).
 */
export function mintPublicationLink(input: MintLinkInput) {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId))
    .get();
  if (!campaign) {
    throw new Error("campaign_not_found");
  }

  const publication = db
    .select()
    .from(publications)
    .where(eq(publications.id, input.publicationId))
    .get();
  if (!publication || publication.campaignId !== campaign.id) {
    throw new Error("publication_not_found");
  }

  const existing = db
    .select()
    .from(links)
    .where(eq(links.publicationId, input.publicationId))
    .get();
  if (existing) {
    return { link: existing, created: false as const };
  }

  let variantLabel: string | null = null;
  if (publication.contentVariantId) {
    const variant = db
      .select()
      .from(contentVariants)
      .where(eq(contentVariants.id, publication.contentVariantId))
      .get();
    variantLabel = variant?.label ?? null;
  }

  const id = newId("lnk");
  const createdAt = nowIso();
  const row = {
    id,
    campaignId: campaign.id,
    publicationId: publication.id,
    destinationUrl: input.destinationUrl ?? campaign.destinationUrl,
    utmSource: input.utmSource ?? publication.channel,
    utmMedium: input.utmMedium ?? "social",
    utmCampaign: input.utmCampaign ?? campaign.slug,
    utmContent:
      input.utmContent ??
      (variantLabel ? `variant-${variantLabel.toLowerCase()}` : publication.id),
    utmTerm: input.utmTerm ?? null,
    label: input.label ?? `Publikation ${publication.channel}`,
    createdAt,
  };

  db.insert(links).values(row).run();
  return { link: row, created: true as const };
}

export function listLinksForCampaign(campaignId: string) {
  const db = getDb();
  return db.select().from(links).where(eq(links.campaignId, campaignId)).all();
}
