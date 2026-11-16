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
  publishedAt: text("published_at"),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
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

/** Manual or API-imported platform reach / interactions / spend */
export const platformStats = sqliteTable("platform_stats", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  publicationId: text("publication_id"),
  channel: text("channel").notNull(),
  metric: text("metric").notNull(),
  value: real("value").notNull().default(0),
  currency: text("currency"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  dataSource: text("data_source").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
