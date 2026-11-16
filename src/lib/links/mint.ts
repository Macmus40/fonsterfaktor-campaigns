import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { campaigns, links } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import type { Link } from "@/lib/types";

export function rowToLink(row: typeof links.$inferSelect): Link {
  return {
    id: row.id,
    campaignId: row.campaignId,
    publicationId: row.publicationId,
    destinationUrl: row.destinationUrl,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmContent: row.utmContent,
    utmTerm: row.utmTerm,
    label: row.label,
    createdAt: row.createdAt,
  };
}

export function mintCampaignLink(opts: {
  campaignId: string;
  publicationId: string;
  channel: string;
  variantLabel?: string | null;
  baseUrl?: string;
}): Link {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, opts.campaignId))
    .get();
  if (!campaign) throw new Error(`Campaign not found: ${opts.campaignId}`);

  const id = newId("lnk");
  const utmSource =
    opts.channel === "facebook_page"
      ? "facebook"
      : opts.channel === "instagram"
        ? "instagram"
        : opts.channel;
  const row = {
    id,
    campaignId: opts.campaignId,
    publicationId: opts.publicationId,
    destinationUrl: campaign.destinationUrl,
    utmSource,
    utmMedium: "social",
    utmCampaign: campaign.slug,
    utmContent: opts.variantLabel ?? opts.publicationId,
    utmTerm: null as string | null,
    label: `${campaign.slug}/${opts.channel}`,
    createdAt: nowIso(),
  };
  db.insert(links).values(row).run();
  return rowToLink(row);
}

export function absoluteCampaignLinkUrl(
  linkId: string,
  origin = "http://localhost:3000",
): string {
  return `${origin.replace(/\/$/, "")}/r/${linkId}`;
}

export function getLink(linkId: string): Link | null {
  const row = getDb().select().from(links).where(eq(links.id, linkId)).get();
  return row ? rowToLink(row) : null;
}
