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
  publication: { channel: string; status: string };
  link: {
    label: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
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
      contextJson: JSON.stringify({
        season: "vinter",
        holiday: null,
        weather: "kyla",
        productFeatures: ["svart finish", "eget mått", "3-glas"],
        priceText: null,
        deadlineText: null,
      }),
      planningReadyAt: null,
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
        userDescription:
          m.kind === "image"
            ? "Svart skjutparti i modern fasad, stort glasparti."
            : "Film som visar öppning av svart skjutparti.",
        sceneNotes:
          m.kind === "video"
            ? "Scen 1: fasad. Scen 2: öppning. Scen 3: interiörljus."
            : null,
        createdAt: ts,
      })
      .run();
  }

  let primaryVariantId: string | null = null;
  for (const v of fixture.contentVariants) {
    const id = newId("cv");
    if (!primaryVariantId) primaryVariantId = id;
    db.insert(contentVariants)
      .values({
        id,
        campaignId,
        materialId: materialIds[0] ?? null,
        locale: v.locale,
        channelHint: v.channelHint ?? null,
        headline: v.headline,
        body: v.body,
        cta: v.cta ?? null,
        label: v.label,
        angle: v.label === "A" ? "price_custom" : "season_problem",
        generationSource: "template",
        extendedJson: JSON.stringify({
          kind: "image",
          headline: v.headline,
          postText: v.body,
          carouselCaptions: [
            v.headline,
            "Eget mått",
            "Se pris",
            v.cta ?? "Öppna konfiguratorn",
          ],
          cta: v.cta ?? "Öppna konfiguratorn",
        }),
        missingFieldsJson: JSON.stringify(["pris", "tidsfrist"]),
        status: v.status,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
  }

  const publicationId = newId("pub");
  const linkId = newId("lnk");
  db.insert(publications)
    .values({
      id: publicationId,
      campaignId,
      channel: fixture.publication.channel,
      externalId: null,
      contentVariantId: primaryVariantId,
      materialIdsJson: JSON.stringify(materialIds),
      status: fixture.publication.status,
      scheduledAt: null,
      publishMode: "manual",
      confirmationKind: null,
      postUrl: null,
      campaignLinkId: linkId,
      lastAttemptId: null,
      publishedAt: null,
      endedAt: null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  db.insert(links)
    .values({
      id: linkId,
      campaignId,
      publicationId,
      destinationUrl: fixture.campaign.destinationUrl,
      utmSource: fixture.link.utmSource ?? null,
      utmMedium: fixture.link.utmMedium ?? null,
      utmCampaign: fixture.link.utmCampaign ?? null,
      utmContent: fixture.link.utmContent ?? null,
      utmTerm: fixture.link.utmTerm ?? null,
      label: fixture.link.label,
      createdAt: ts,
    })
    .run();

  console.log("Seeded demo campaign Svart skjutparti");
  console.log(`  campaignId=${campaignId}`);
  console.log(`  linkId=${linkId}`);
  console.log(`  tagged path=/r/${linkId}`);
  console.log(`  db=${path.join(process.cwd(), "data/campaigns.sqlite")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
