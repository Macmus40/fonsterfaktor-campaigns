import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  product: text("product").notNull(),
  goal: text("goal").notNull(),
  destinationUrl: text("destination_url").notNull(),
  market: text("market").notNull().default("SE"),
  region: text("region"),
  status: text("status").notNull().default("draft"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  durationSec: real("duration_sec"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const contentVariants = sqliteTable("content_variants", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  locale: text("locale").notNull().default("sv-SE"),
  channelHint: text("channel_hint"),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  cta: text("cta"),
  label: text("label").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  channel: text("channel").notNull(),
  externalId: text("external_id"),
  contentVariantId: text("content_variant_id"),
  materialIdsJson: text("material_ids_json").notNull().default("[]"),
  status: text("status").notNull().default("draft"),
  scheduledAt: text("scheduled_at"),
  publishMode: text("publish_mode").notNull().default("manual"),
  confirmationKind: text("confirmation_kind"),
  postUrl: text("post_url"),
  campaignLinkId: text("campaign_link_id"),
  lastAttemptId: text("last_attempt_id"),
  publishedAt: text("published_at"),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const publicationAttempts = sqliteTable("publication_attempts", {
  id: text("id").primaryKey(),
  publicationId: text("publication_id")
    .notNull()
    .references(() => publications.id),
  mode: text("mode").notNull(),
  outcome: text("outcome").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  errorMessage: text("error_message"),
  responseJson: text("response_json").notNull().default("{}"),
  platformPostId: text("platform_post_id"),
  platformPostUrl: text("platform_post_url"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  reconciledFromAttemptId: text("reconciled_from_attempt_id"),
  createdAt: text("created_at").notNull(),
});

export const analyticsHandoffs = sqliteTable("analytics_handoffs", {
  id: text("id").primaryKey(),
  publicationId: text("publication_id")
    .notNull()
    .references(() => publications.id),
  campaignId: text("campaign_id").notNull(),
  channel: text("channel").notNull(),
  postUrl: text("post_url"),
  platformPostId: text("platform_post_id"),
  campaignLinkId: text("campaign_link_id"),
  confirmationKind: text("confirmation_kind").notNull(),
  handedOffAt: text("handed_off_at").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
});

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  publicationId: text("publication_id"),
  destinationUrl: text("destination_url").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  label: text("label"),
  createdAt: text("created_at").notNull(),
});

export const conversionEvents = sqliteTable("conversion_events", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id"),
  linkId: text("link_id"),
  publicationId: text("publication_id"),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: text("created_at").notNull(),
});

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  publicationId: text("publication_id"),
  metric: text("metric").notNull(),
  value: real("value").notNull().default(0),
  windowStart: text("window_start"),
  windowEnd: text("window_end"),
  source: text("source").notNull(),
  updatedAt: text("updated_at").notNull(),
});
