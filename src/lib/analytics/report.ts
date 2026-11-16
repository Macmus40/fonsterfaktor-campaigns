import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  contentVariants,
  conversionEvents,
  links,
  platformStats,
  publications,
} from "@/lib/db/schema";
import type {
  ConversionMeasurementStatus,
  FunnelCounters,
} from "@/lib/types";

export type ReportFilters = {
  campaignId?: string | null;
  campaignSlug?: string | null;
  from?: string | null;
  to?: string | null;
};

export type PublicationReportRow = {
  publicationId: string;
  channel: string;
  status: string;
  contentVariantId: string | null;
  contentVariantLabel: string | null;
  contentVariantHeadline: string | null;
  linkId: string | null;
  taggedPath: string | null;
  funnel: FunnelCounters;
  platformStatsSource: Array<{
    metric: string;
    value: number;
    dataSource: string;
    verified: boolean;
  }>;
};

export type CampaignReport = {
  campaign: {
    id: string;
    slug: string;
    name: string;
    product: string;
    destinationUrl: string;
    isDemo: boolean;
  };
  period: { from: string | null; to: string | null };
  conversionMeasurementStatus: ConversionMeasurementStatus;
  conversionMeasurementLabel: string;
  /** Disclaimer: redirects ≠ unique customers */
  semantics: {
    transitionsAreNotUniqueCustomers: true;
    linkPreviewsExcludedFromTransitions: true;
  };
  totals: FunnelCounters;
  byChannel: Array<{ channel: string; funnel: FunnelCounters }>;
  byPublication: PublicationReportRow[];
  byVariant: Array<{
    contentVariantId: string | null;
    label: string | null;
    headline: string | null;
    funnel: FunnelCounters;
  }>;
};

function emptyFunnel(): FunnelCounters {
  return {
    platformReach: 0,
    platformInteractions: 0,
    platformSpend: 0,
    transitions: 0,
    linkPreviews: 0,
    priceViews: 0,
    inquiries: 0,
  };
}

function addFunnel(a: FunnelCounters, b: FunnelCounters): FunnelCounters {
  return {
    platformReach: a.platformReach + b.platformReach,
    platformInteractions: a.platformInteractions + b.platformInteractions,
    platformSpend: a.platformSpend + b.platformSpend,
    transitions: a.transitions + b.transitions,
    linkPreviews: a.linkPreviews + b.linkPreviews,
    priceViews: a.priceViews + b.priceViews,
    inquiries: a.inquiries + b.inquiries,
  };
}

function resolveCampaign(filters: ReportFilters) {
  const db = getDb();
  if (filters.campaignId) {
    return db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, filters.campaignId))
      .get();
  }
  if (filters.campaignSlug) {
    return db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, filters.campaignSlug))
      .get();
  }
  return db.select().from(campaigns).all()[0] ?? null;
}

export function buildCampaignReport(filters: ReportFilters = {}): CampaignReport | null {
  const db = getDb();
  const campaign = resolveCampaign(filters);
  if (!campaign) return null;

  const from = filters.from ?? null;
  const to = filters.to ?? null;

  const pubs = db
    .select()
    .from(publications)
    .where(eq(publications.campaignId, campaign.id))
    .all();

  const allLinks = db
    .select()
    .from(links)
    .where(eq(links.campaignId, campaign.id))
    .all();

  const variants = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all();

  const eventConds = [eq(conversionEvents.campaignId, campaign.id)];
  if (from) eventConds.push(gte(conversionEvents.occurredAt, from));
  if (to) eventConds.push(lte(conversionEvents.occurredAt, to));

  const events = db
    .select()
    .from(conversionEvents)
    .where(and(...eventConds))
    .all();

  const statConds = [eq(platformStats.campaignId, campaign.id)];
  if (from) statConds.push(gte(platformStats.periodStart, from));
  if (to) statConds.push(lte(platformStats.periodEnd, to));

  const stats = db
    .select()
    .from(platformStats)
    .where(and(...statConds))
    .all();

  const hasDinNext = events.some((e) => e.source === "din_next");
  const conversionMeasurementStatus: ConversionMeasurementStatus = hasDinNext
    ? "ok"
    : "brak_pomiaru_konwersji";
  const conversionMeasurementLabel = hasDinNext
    ? "Pomiar konwersji aktywny (DIN Next / symulator)"
    : "brak pomiaru konwersji";

  const byPublication: PublicationReportRow[] = pubs.map((pub) => {
    const link = allLinks.find((l) => l.publicationId === pub.id) ?? null;
    const variant = pub.contentVariantId
      ? variants.find((v) => v.id === pub.contentVariantId)
      : null;
    const funnel = emptyFunnel();

    for (const e of events) {
      if (e.publicationId !== pub.id) continue;
      if (e.eventType === "click") funnel.transitions += 1;
      if (e.eventType === "link_preview") funnel.linkPreviews += 1;
      if (e.eventType === "price_view") funnel.priceViews += 1;
      if (e.eventType === "inquiry_submitted") funnel.inquiries += 1;
    }

    const pubStats = stats.filter((s) => s.publicationId === pub.id);
    for (const s of pubStats) {
      if (s.metric === "reach" || s.metric === "impressions") {
        if (s.metric === "reach") funnel.platformReach += s.value;
      }
      if (s.metric === "interactions") funnel.platformInteractions += s.value;
      if (s.metric === "spend") funnel.platformSpend += s.value;
    }

    return {
      publicationId: pub.id,
      channel: pub.channel,
      status: pub.status,
      contentVariantId: pub.contentVariantId,
      contentVariantLabel: variant?.label ?? null,
      contentVariantHeadline: variant?.headline ?? null,
      linkId: link?.id ?? null,
      taggedPath: link ? `/r/${link.id}` : null,
      funnel,
      platformStatsSource: pubStats.map((s) => ({
        metric: s.metric,
        value: s.value,
        dataSource: s.dataSource,
        verified: Boolean(s.verified),
      })),
    };
  });

  const channelMap = new Map<string, FunnelCounters>();
  for (const row of byPublication) {
    const prev = channelMap.get(row.channel) ?? emptyFunnel();
    channelMap.set(row.channel, addFunnel(prev, row.funnel));
  }

  const variantMap = new Map<
    string,
    {
      contentVariantId: string | null;
      label: string | null;
      headline: string | null;
      funnel: FunnelCounters;
    }
  >();
  for (const row of byPublication) {
    const key = row.contentVariantId ?? "none";
    const prev = variantMap.get(key) ?? {
      contentVariantId: row.contentVariantId,
      label: row.contentVariantLabel,
      headline: row.contentVariantHeadline,
      funnel: emptyFunnel(),
    };
    prev.funnel = addFunnel(prev.funnel, row.funnel);
    variantMap.set(key, prev);
  }

  // Campaign-level platform stats without publication scope
  const campaignOnlyStats = stats.filter((s) => !s.publicationId);
  let campaignStatFunnel = emptyFunnel();
  for (const s of campaignOnlyStats) {
    if (s.metric === "reach") campaignStatFunnel.platformReach += s.value;
    if (s.metric === "interactions")
      campaignStatFunnel.platformInteractions += s.value;
    if (s.metric === "spend") campaignStatFunnel.platformSpend += s.value;
  }

  const totals = byPublication.reduce(
    (acc, row) => addFunnel(acc, row.funnel),
    campaignStatFunnel,
  );

  return {
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      product: campaign.product,
      destinationUrl: campaign.destinationUrl,
      isDemo: campaign.isDemo,
    },
    period: { from, to },
    conversionMeasurementStatus,
    conversionMeasurementLabel,
    semantics: {
      transitionsAreNotUniqueCustomers: true,
      linkPreviewsExcludedFromTransitions: true,
    },
    totals,
    byChannel: [...channelMap.entries()].map(([channel, funnel]) => ({
      channel,
      funnel,
    })),
    byPublication,
    byVariant: [...variantMap.values()],
  };
}

export function countEventsByType(campaignId: string) {
  const db = getDb();
  return db
    .select({
      source: conversionEvents.source,
      eventType: conversionEvents.eventType,
      n: sql<number>`count(*)`,
    })
    .from(conversionEvents)
    .where(eq(conversionEvents.campaignId, campaignId))
    .groupBy(conversionEvents.source, conversionEvents.eventType)
    .all();
}
