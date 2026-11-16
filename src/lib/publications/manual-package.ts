import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contentVariants, materials, publications } from "@/lib/db/schema";
import { absoluteCampaignLinkUrl, getLink } from "@/lib/links/mint";
import { rowToPublication } from "./mappers";
import type { ManualPublishPackage } from "@/lib/types";

export function buildManualPackage(
  publicationId: string,
  origin = "http://localhost:3000",
): ManualPublishPackage {
  const db = getDb();
  const row = db
    .select()
    .from(publications)
    .where(eq(publications.id, publicationId))
    .get();
  if (!row) throw new Error(`Publication not found: ${publicationId}`);
  const pub = rowToPublication(row);

  if (!pub.contentVariantId) {
    throw new Error("Publication has no content variant");
  }
  const variant = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.id, pub.contentVariantId))
    .get();
  if (!variant) throw new Error("Content variant missing");

  if (!pub.campaignLinkId) {
    throw new Error("Publication has no campaign link — schedule first");
  }
  const link = getLink(pub.campaignLinkId);
  if (!link) throw new Error("Campaign link missing");

  const mats =
    pub.materialIds.length > 0
      ? db
          .select()
          .from(materials)
          .where(inArray(materials.id, pub.materialIds))
          .all()
      : [];

  const campaignLinkUrl = absoluteCampaignLinkUrl(link.id, origin);
  const copyText = [
    variant.headline,
    "",
    variant.body,
    variant.cta ? `\n${variant.cta}` : "",
    "",
    campaignLinkUrl,
  ]
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n")
    .trim();

  return {
    publicationId: pub.id,
    channel: pub.channel,
    headline: variant.headline,
    body: variant.body,
    cta: variant.cta,
    campaignLinkUrl,
    campaignLinkId: link.id,
    materials: mats.map((m) => ({
      id: m.id,
      title: m.title,
      kind: m.kind as "image" | "video",
      url: m.url,
      mimeType: m.mimeType,
    })),
    copyText,
  };
}
