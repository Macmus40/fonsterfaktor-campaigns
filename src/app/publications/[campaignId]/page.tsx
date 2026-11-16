import { notFound } from "next/navigation";
import { PublicationsWorkspace } from "@/components/publications/PublicationsWorkspace";
import { metaChannelCapabilities } from "@/lib/publications/meta/config";
import { getCampaignBundle } from "@/lib/publications/service";
import type { ContentVariant } from "@/lib/types";
import { STOCKHOLM_TZ } from "@/lib/time/stockholm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ campaignId: string }> };

export default async function CampaignPublicationsPage({ params }: Props) {
  const { campaignId } = await params;
  const bundle = getCampaignBundle(campaignId);
  if (!bundle) notFound();

  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STOCKHOLM_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(nowParts.find((p) => p.type === "year")?.value);
  const month = Number(nowParts.find((p) => p.type === "month")?.value);

  const variants: ContentVariant[] = bundle.variants.map((v) => ({
    id: v.id,
    campaignId: v.campaignId,
    materialId: v.materialId ?? null,
    locale: v.locale,
    channelHint: v.channelHint,
    headline: v.headline,
    body: v.body,
    cta: v.cta,
    label: v.label,
    angle: (v.angle || "custom") as ContentVariant["angle"],
    generationSource: (v.generationSource ||
      "template") as ContentVariant["generationSource"],
    extendedJson: v.extendedJson || "{}",
    missingFieldsJson: v.missingFieldsJson || "[]",
    status: v.status as ContentVariant["status"],
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));

  return (
    <PublicationsWorkspace
      campaign={{
        id: bundle.campaign.id,
        name: bundle.campaign.name,
        slug: bundle.campaign.slug,
        product: bundle.campaign.product,
        status: bundle.campaign.status,
      }}
      variants={variants}
      initialPublications={bundle.publications}
      metaChannels={metaChannelCapabilities()}
      year={year}
      month={month}
    />
  );
}
