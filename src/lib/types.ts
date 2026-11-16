/** Shared domain types — see docs/campaign-contract.md */

export type CampaignStatus =
  | "draft"
  | "ready"
  | "active"
  | "paused"
  | "archived";

export type MaterialKind = "image" | "video";

export type ContentVariantStatus = "draft" | "approved" | "retired";

export type PublicationStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "paused"
  | "ended"
  | "failed";

export type EventSource = "tagged_link" | "din_next";

export type MeasurementSource = EventSource | "mixed";

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  product: string;
  goal: string;
  destinationUrl: string;
  market: string;
  region: string | null;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  campaignId: string;
  kind: MaterialKind;
  title: string;
  url: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface ContentVariant {
  id: string;
  campaignId: string;
  locale: string;
  channelHint: string | null;
  headline: string;
  body: string;
  cta: string | null;
  label: string;
  status: ContentVariantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Publication {
  id: string;
  campaignId: string;
  channel: string;
  externalId: string | null;
  contentVariantId: string | null;
  materialIds: string[];
  status: PublicationStatus;
  publishedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string;
  campaignId: string;
  publicationId: string | null;
  destinationUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  label: string | null;
  createdAt: string;
}

export interface ConversionEvent {
  id: string;
  campaignId: string | null;
  linkId: string | null;
  publicationId: string | null;
  source: EventSource;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface Measurement {
  id: string;
  campaignId: string;
  publicationId: string | null;
  metric: string;
  value: number;
  windowStart: string | null;
  windowEnd: string | null;
  source: MeasurementSource;
  updatedAt: string;
}

export interface DinNextEventPayload {
  eventType: "price_view" | "inquiry_submitted" | string;
  occurredAt?: string;
  campaignSlug?: string;
  campaignId?: string;
  linkId?: string;
  publicationId?: string;
  contentVariantId?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

/** Platform metrics entered manually or pulled from a verified API */
export type PlatformStatMetric =
  | "reach"
  | "impressions"
  | "interactions"
  | "spend"
  | "platform_clicks";

export type PlatformDataSource =
  | "manual"
  | "meta_api"
  | "google_ads_api"
  | "other_api";

export interface PlatformStat {
  id: string;
  campaignId: string;
  publicationId: string | null;
  channel: string;
  metric: PlatformStatMetric | string;
  value: number;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dataSource: PlatformDataSource | string;
  verified: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConversionMeasurementStatus =
  | "ok"
  | "brak_pomiaru_konwersji";

/** Funnel counters used in reports — never treat redirects as unique customers */
export interface FunnelCounters {
  platformReach: number;
  platformInteractions: number;
  platformSpend: number;
  /** Human transitions via tagged links (bots/previews excluded) */
  transitions: number;
  /** Known link-preview / bot hits — shown separately, not as customers */
  linkPreviews: number;
  priceViews: number;
  inquiries: number;
}
