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
  | "publishing"
  | "published"
  | "paused"
  | "ended"
  | "failed"
  | "ambiguous";

/** How the operator intends to ship the post. */
export type PublishMode = "manual" | "test" | "connected";

/**
 * How the current published state was confirmed.
 * Shown in UI so operators know whether Meta confirmed the post.
 */
export type ConfirmationKind = "manual" | "test" | "platform";

export type PublicationChannel =
  | "facebook_page"
  | "instagram"
  | "manual"
  | "meta"
  | "google"
  | "email"
  | "organic"
  | string;

export type AttemptOutcome =
  | "success"
  | "failure"
  | "ambiguous"
  | "pending"
  | "skipped";

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
  channel: PublicationChannel;
  externalId: string | null;
  contentVariantId: string | null;
  materialIds: string[];
  status: PublicationStatus;
  /** ISO UTC; UI displays in Europe/Stockholm. */
  scheduledAt: string | null;
  publishMode: PublishMode;
  confirmationKind: ConfirmationKind | null;
  postUrl: string | null;
  campaignLinkId: string | null;
  lastAttemptId: string | null;
  publishedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationAttempt {
  id: string;
  publicationId: string;
  mode: PublishMode;
  outcome: AttemptOutcome;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  /** Opaque platform / simulator payload for audit. */
  responseJson: Record<string, unknown>;
  platformPostId: string | null;
  platformPostUrl: string | null;
  /** Client-supplied key so retries after ambiguous results stay safe. */
  idempotencyKey: string;
  /** True when reconcile resolved a prior ambiguous attempt. */
  reconciledFromAttemptId: string | null;
  createdAt: string;
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
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

/** Package an operator copies when publishing manually. */
export interface ManualPublishPackage {
  publicationId: string;
  channel: PublicationChannel;
  headline: string;
  body: string;
  cta: string | null;
  campaignLinkUrl: string;
  campaignLinkId: string;
  materials: Array<{
    id: string;
    title: string;
    kind: MaterialKind;
    url: string;
    mimeType: string | null;
  }>;
  copyText: string;
}

/** Handoff payload for the analytics module (agent 4). */
export interface AnalyticsHandoff {
  publicationId: string;
  campaignId: string;
  channel: PublicationChannel;
  postUrl: string | null;
  platformPostId: string | null;
  campaignLinkId: string | null;
  confirmationKind: ConfirmationKind;
  handedOffAt: string;
}

export type MetaChannelStatus =
  | "ready"
  | "configured_untested"
  | "blocked_missing_credentials"
  | "blocked_account_scope"
  | "not_day1_priority";

export interface MetaChannelCapability {
  channel: "facebook_page" | "instagram";
  status: MetaChannelStatus;
  day1Priority: boolean;
  requirements: string[];
  notes: string;
}
