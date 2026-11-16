/**
 * Acceptance scenario for links + analytics:
 * - two posts with separate tagged links
 * - redirects to konfigurator (product params preserved)
 * - simulated price views + inquiries (post A more traffic, post B more conversions)
 * - duplicate DIN Next event (no double count)
 * - report shows high-traffic post can yield fewer inquiries
 *
 * Usage (dev server optional for HTTP checks):
 *   npm run seed:demo
 *   npm run acceptance:analytics
 */
import { eq } from "drizzle-orm";
import { buildCampaignReport } from "../src/lib/analytics/report";
import { buildWeeklySummary } from "../src/lib/analytics/weekly-summary";
import { upsertPlatformStat } from "../src/lib/analytics/platform-stats";
import { getDb } from "../src/lib/db/client";
import {
  campaigns,
  contentVariants,
  conversionEvents,
  links,
  publications,
} from "../src/lib/db/schema";
import { ingestConversionEvent, ingestDinNextEvent } from "../src/lib/events/ingest";
import { classifyUserAgent } from "../src/lib/links/bots";
import { buildRedirectDestination } from "../src/lib/links/destination";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

async function main() {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get();
  assert(campaign, "Run npm run seed:demo first");

  const pubs = db
    .select()
    .from(publications)
    .where(eq(publications.campaignId, campaign.id))
    .all();
  assert(pubs.length >= 2, "Need two publications");

  const variants = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all();

  const pubA =
    pubs.find((p) => {
      const v = variants.find((x) => x.id === p.contentVariantId);
      return v?.label === "A";
    }) ?? pubs[0];
  const pubB =
    pubs.find((p) => {
      const v = variants.find((x) => x.id === p.contentVariantId);
      return v?.label === "B";
    }) ?? pubs[1];

  const linkA = db
    .select()
    .from(links)
    .where(eq(links.publicationId, pubA.id))
    .get();
  const linkB = db
    .select()
    .from(links)
    .where(eq(links.publicationId, pubB.id))
    .get();
  assert(linkA && linkB, "Each publication needs its own link");
  assert(linkA.id !== linkB.id, "Links must be distinct");

  // Product params preserved on redirect
  const dest = buildRedirectDestination({
    destinationUrl: linkA.destinationUrl,
    linkId: linkA.id,
    publicationId: linkA.publicationId,
    contentVariantLabel: "A",
    utm: {
      utm_source: linkA.utmSource,
      utm_medium: linkA.utmMedium,
      utm_campaign: linkA.utmCampaign,
      utm_content: linkA.utmContent,
    },
  });
  const destUrl = new URL(dest);
  assert(destUrl.searchParams.get("product") === "skjutparti", "product param");
  assert(destUrl.searchParams.get("finish") === "svart", "finish param");
  assert(destUrl.searchParams.get("ff_link_id") === linkA.id, "ff_link_id");

  // Bot preview detection
  const fb = classifyUserAgent("facebookexternalhit/1.1");
  assert(fb.isBot && fb.kind === "link_preview", "facebook preview bot");

  // Clear prior events for clean acceptance counts (demo only)
  db.delete(conversionEvents)
    .where(eq(conversionEvents.campaignId, campaign.id))
    .run();

  // Post A: high traffic, few conversions
  for (let i = 0; i < 20; i++) {
    ingestConversionEvent({
      source: "tagged_link",
      eventType: "click",
      campaignId: campaign.id,
      linkId: linkA.id,
      publicationId: pubA.id,
      idempotencyKey: `acc:click:A:${i}`,
      payload: { acceptance: true },
    });
  }
  // One bot preview on A (must not count as transition)
  ingestConversionEvent({
    source: "tagged_link",
    eventType: "link_preview",
    campaignId: campaign.id,
    linkId: linkA.id,
    publicationId: pubA.id,
    idempotencyKey: "acc:preview:A",
    payload: { userAgent: "facebookexternalhit/1.1" },
  });

  for (let i = 0; i < 2; i++) {
    ingestDinNextEvent({
      eventType: "price_view",
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      linkId: linkA.id,
      publicationId: pubA.id,
      idempotencyKey: `acc:price:A:${i}`,
      payload: { priceSek: 40000 + i, simulator: true },
    });
  }
  ingestDinNextEvent({
    eventType: "inquiry_submitted",
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    linkId: linkA.id,
    publicationId: pubA.id,
    idempotencyKey: "acc:inq:A:0",
    payload: { inquiryId: "acc-a-0", simulator: true },
  });

  // Post B: lower traffic, more price views + inquiries
  for (let i = 0; i < 8; i++) {
    ingestConversionEvent({
      source: "tagged_link",
      eventType: "click",
      campaignId: campaign.id,
      linkId: linkB.id,
      publicationId: pubB.id,
      idempotencyKey: `acc:click:B:${i}`,
      payload: { acceptance: true },
    });
  }
  for (let i = 0; i < 6; i++) {
    ingestDinNextEvent({
      eventType: "price_view",
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      linkId: linkB.id,
      publicationId: pubB.id,
      idempotencyKey: `acc:price:B:${i}`,
      payload: { priceSek: 42000 + i, simulator: true },
    });
  }
  for (let i = 0; i < 4; i++) {
    ingestDinNextEvent({
      eventType: "inquiry_submitted",
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      linkId: linkB.id,
      publicationId: pubB.id,
      idempotencyKey: `acc:inq:B:${i}`,
      payload: { inquiryId: `acc-b-${i}`, simulator: true },
    });
  }

  // Duplicate event — must not double-count
  const dup1 = ingestDinNextEvent({
    eventType: "inquiry_submitted",
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    linkId: linkB.id,
    publicationId: pubB.id,
    idempotencyKey: "acc:inq:B:0",
    payload: {
      inquiryId: "acc-b-0",
      simulator: true,
      email: "should-be-stripped@example.com",
    },
  });
  assert(dup1.deduped === true, "duplicate must be deduped");

  // Manual platform stats
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubA.id,
    channel: "meta",
    metric: "reach",
    value: 5000,
    dataSource: "manual",
    verified: false,
    notes: "Acceptance manual reach A",
  });
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubA.id,
    channel: "meta",
    metric: "interactions",
    value: 400,
    dataSource: "manual",
  });
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubA.id,
    channel: "meta",
    metric: "spend",
    value: 1200,
    currency: "SEK",
    dataSource: "manual",
  });
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubB.id,
    channel: "meta",
    metric: "reach",
    value: 1800,
    dataSource: "manual",
  });
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubB.id,
    channel: "meta",
    metric: "interactions",
    value: 220,
    dataSource: "manual",
  });
  upsertPlatformStat({
    campaignId: campaign.id,
    publicationId: pubB.id,
    channel: "meta",
    metric: "spend",
    value: 900,
    currency: "SEK",
    dataSource: "manual",
  });

  const report = buildCampaignReport({ campaignId: campaign.id });
  assert(report, "report");
  assert(
    report.conversionMeasurementStatus === "ok",
    "conversion measurement should be active",
  );
  assert(
    report.semantics.transitionsAreNotUniqueCustomers === true,
    "semantics flag",
  );

  const rowA = report.byPublication.find((p) => p.publicationId === pubA.id)!;
  const rowB = report.byPublication.find((p) => p.publicationId === pubB.id)!;

  assert(rowA.funnel.transitions === 20, `A transitions=${rowA.funnel.transitions}`);
  assert(rowA.funnel.linkPreviews === 1, "A preview counted separately");
  assert(rowA.funnel.inquiries === 1, "A inquiries");
  assert(rowB.funnel.transitions === 8, "B transitions");
  assert(rowB.funnel.inquiries === 4, "B inquiries (no double from dup)");
  assert(
    rowA.funnel.transitions > rowB.funnel.transitions &&
      rowA.funnel.inquiries < rowB.funnel.inquiries,
    "high traffic A, more inquiries B",
  );

  const summary = buildWeeklySummary(report);
  console.log("\n=== Acceptance OK ===");
  console.log("Links:");
  console.log(`  A /r/${linkA.id}`);
  console.log(`  B /r/${linkB.id}`);
  console.log("Redirect sample:", dest);
  console.log("Funnel A:", rowA.funnel);
  console.log("Funnel B:", rowB.funnel);
  console.log("What changed:", summary.whatChanged.headline);
  console.log("Drop-off:", summary.dropOff.headline);
  console.log("Next test:", summary.nextTest.headline);
  console.log("Open report: http://localhost:3000/analytics");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
