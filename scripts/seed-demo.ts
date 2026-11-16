/**
 * Seeds demo data only (isDemo=true). Production DB path stays otherwise empty.
 * Usage: npm run seed:demo
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import {
  campaigns,
  contentVariants,
  links,
  materials,
  publications,
} from "../src/lib/db/schema";
import { newId, nowIso } from "../src/lib/id";

type DemoFixture = {
  campaign: {
    slug: string;
    name: string;
    product: string;
    goal: string;
    destinationUrl: string;
    market: string;
    region: string | null;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    isDemo: boolean;
  };
  materials: Array<{
    kind: string;
    title: string;
    url: string;
    mimeType?: string;
    width?: number;
    height?: number;
    durationSec?: number;
    sortOrder?: number;
  }>;
  contentVariants: Array<{
    locale: string;
    channelHint?: string;
    label: string;
    headline: string;
    body: string;
    cta?: string;
    status: string;
  }>;
  publications: Array<{
    channel: string;
    status: string;
    variantLabel: string;
    materialIndex?: number;
    label?: string;
    link: {
      label: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    };
  }>;
};

async function main() {
  const fixturePath = path.join(
    process.cwd(),
    "seed/demo/svart-skjutparti.json",
  );
  const fixture = JSON.parse(
    fs.readFileSync(fixturePath, "utf8"),
  ) as DemoFixture;

  const db = getDb();
  const ts = nowIso();

  const existing = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, fixture.campaign.slug))
    .get();

  if (existing) {
    console.log(
      `Demo campaign already present: ${existing.slug} (${existing.id})`,
    );
    const existingLinks = db
      .select()
      .from(links)
      .where(eq(links.campaignId, existing.id))
      .all();
    for (const l of existingLinks) {
      console.log(`  tagged path=/r/${l.id} (${l.label})`);
    }
    return;
  }

  const campaignId = newId("cmp");
  db.insert(campaigns)
    .values({
      id: campaignId,
      slug: fixture.campaign.slug,
      name: fixture.campaign.name,
      product: fixture.campaign.product,
      goal: fixture.campaign.goal,
      destinationUrl: fixture.campaign.destinationUrl,
      market: fixture.campaign.market,
      region: fixture.campaign.region,
      status: fixture.campaign.status,
      startsAt: fixture.campaign.startsAt,
      endsAt: fixture.campaign.endsAt,
      isDemo: true,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  const materialIds: string[] = [];
  for (const m of fixture.materials) {
    const id = newId("mat");
    materialIds.push(id);
    db.insert(materials)
      .values({
        id,
        campaignId,
        kind: m.kind,
        title: m.title,
        url: m.url,
        mimeType: m.mimeType ?? null,
        width: m.width ?? null,
        height: m.height ?? null,
        durationSec: m.durationSec ?? null,
        sortOrder: m.sortOrder ?? 0,
        createdAt: ts,
      })
      .run();
  }

  const variantByLabel = new Map<string, string>();
  for (const v of fixture.contentVariants) {
    const id = newId("cv");
    variantByLabel.set(v.label, id);
    db.insert(contentVariants)
      .values({
        id,
        campaignId,
        locale: v.locale,
        channelHint: v.channelHint ?? null,
        headline: v.headline,
        body: v.body,
        cta: v.cta ?? null,
        label: v.label,
        status: v.status,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
  }

  console.log("Seeded demo campaign Svart skjutparti");
  console.log(`  campaignId=${campaignId}`);

  for (const pub of fixture.publications) {
    const publicationId = newId("pub");
    const variantId = variantByLabel.get(pub.variantLabel) ?? null;
    const matId =
      typeof pub.materialIndex === "number"
        ? materialIds[pub.materialIndex]
        : materialIds[0];

    db.insert(publications)
      .values({
        id: publicationId,
        campaignId,
        channel: pub.channel,
        externalId: null,
        contentVariantId: variantId,
        materialIdsJson: JSON.stringify(matId ? [matId] : []),
        status: pub.status,
        publishedAt: ts,
        endedAt: null,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();

    const linkId = newId("lnk");
    db.insert(links)
      .values({
        id: linkId,
        campaignId,
        publicationId,
        destinationUrl: fixture.campaign.destinationUrl,
        utmSource: pub.link.utmSource ?? null,
        utmMedium: pub.link.utmMedium ?? null,
        utmCampaign: pub.link.utmCampaign ?? null,
        utmContent: pub.link.utmContent ?? null,
        utmTerm: pub.link.utmTerm ?? null,
        label: pub.link.label,
        createdAt: ts,
      })
      .run();

    console.log(
      `  publication ${pub.label ?? pub.variantLabel} (${publicationId}) → /r/${linkId}`,
    );
  }

  console.log(`  db=${path.join(process.cwd(), "data/campaigns.sqlite")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
