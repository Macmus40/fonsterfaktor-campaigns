# Campaign contract

Domain contract for the FönsterFaktor Campaigns internal panel. Sweden-market Drutex product campaigns. DIN Next is an external traffic destination only.

## Core models

### Campaign
| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (uuid) | Primary key |
| `slug` | string | Stable short id for links |
| `name` | string | Display name (e.g. “Svart skjutparti”) |
| `product` | string | Drutex product / product family |
| `goal` | string | Campaign goal (awareness, leads, price views, …) |
| `destinationUrl` | string | Target URL (usually DIN Next configurator) |
| `market` | string | Market code, default `SE` |
| `region` | string \| null | Optional region within market |
| `status` | enum | `draft` \| `ready` \| `active` \| `paused` \| `archived` |
| `startsAt` | datetime \| null | Planned / actual start |
| `endsAt` | datetime \| null | Planned / actual end |
| `contextJson` | JSON \| null | Creative context (season, holiday, weather, features, price…) |
| `planningReadyAt` | datetime \| null | Set when handed off to planning (`status → ready`) |
| `isDemo` | boolean | Demo seed vs real data |
| `createdAt` / `updatedAt` | datetime | Audit |

**Cardinality:** one campaign → many materials, many content variants, many publications, many links, many conversion events, many measurements.

**Independence:** campaign `status` is independent of every publication `status`.

### Material
Images and videos attached to a campaign.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `campaignId` | string | FK → Campaign |
| `kind` | enum | `image` \| `video` |
| `title` | string | |
| `url` | string | Local path or absolute URL |
| `mimeType` | string \| null | |
| `width` / `height` / `durationSec` | number \| null | Optional media metadata |
| `sortOrder` | number | Display order |
| `userDescription` | string \| null | Operator description of the material |
| `sceneNotes` | string \| null | Optional scene-by-scene notes (especially video) |
| `createdAt` | datetime | |

### CampaignContext (on Campaign.contextJson)
Optional creative context for Swedish generation. Missing commercial facts are requested in the UI or omitted from copy (never invented): `season`, `holiday`, `weather`, `productFeatures[]`, `priceText`, `deadlineText`, `configuratorCtaUrl`.

### ContentVariant
Swedish text variants for ads / posts / landing copy. Generate ≥2 angles per material. Draft vs approved must be visually distinct in the panel.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `campaignId` | string | FK → Campaign |
| `materialId` | string \| null | FK → Material |
| `locale` | string | Default `sv-SE` |
| `channelHint` | string \| null | e.g. `meta`, `google`, `email`, `organic` |
| `headline` | string | Flat summary (publications use this) |
| `body` | string | Flat summary body |
| `cta` | string \| null | Call to action |
| `label` | string | Internal label (`A`, `B`, `long-form`) |
| `angle` | enum | `price_custom` \| `season_problem` \| `custom` |
| `generationSource` | enum | `user_description` \| `material_analysis` \| `template` \| `local_model` |
| `extendedJson` | JSON | Image: headline/postText/carouselCaptions/cta. Video: opening/overlaySequence/narration/publicationDescription. Both may also include `slogan` (ad headline), `hashtags` (`#tag` strings) and `slideIds` (ordered material ids for the post carousel). Flat `headline`/`body` mirror the slogan and the caption with hashtags so publications stay in sync. |
| `missingFieldsJson` | JSON string[] | Facts omitted / requested |
| `status` | enum | `draft` \| `approved` \| `retired` |
| `createdAt` / `updatedAt` | datetime | |

### Authoring flow (Agent 2)
1. Product + goal (+ region / season / holiday / weather / features).
2. Add photo or video (+ description / scene notes).
3. Generate ≥2 Swedish proposals via **local templates** (no paid API); optional `LOCAL_LLM_URL`.
4. Preview material beside copy; edit; approve.
5. Mark campaign `ready` (`planningReadyAt`) for publications (Agent 3). Video texts are editable/copyable in v1 (not burned in).

### Publication
A placement of a campaign on a channel. Status is **independent** of campaign status.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `campaignId` | string | FK → Campaign |
| `channel` | string | Preferred day-1: `facebook_page`; also `instagram`, plus legacy hints (`meta`, `manual`, …) |
| `externalId` | string \| null | Channel-side post id when known |
| `contentVariantId` | string \| null | FK → ContentVariant — **must be `approved` before send** |
| `materialIds` | JSON string[] | Materials used in this publication |
| `status` | enum | `draft` \| `scheduled` \| `publishing` \| `published` \| `paused` \| `ended` \| `failed` \| `ambiguous` |
| `scheduledAt` | datetime \| null | Stored UTC; UI calendar uses **Europe/Stockholm** |
| `publishMode` | enum | `manual` \| `test` \| `connected` |
| `confirmationKind` | enum \| null | `manual` \| `test` \| `platform` — how publication was confirmed |
| `postUrl` | string \| null | Public post URL when known |
| `campaignLinkId` | string \| null | FK → Link minted for this publication |
| `lastAttemptId` | string \| null | FK → PublicationAttempt |
| `publishedAt` / `endedAt` | datetime \| null | |
| `createdAt` / `updatedAt` | datetime | |

### PublicationAttempt
Per-send history for a publication (success, failure, ambiguous).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `publicationId` | string | FK → Publication |
| `mode` | enum | `manual` \| `test` \| `connected` |
| `outcome` | enum | `success` \| `failure` \| `ambiguous` \| `pending` \| `skipped` |
| `startedAt` / `finishedAt` | datetime | |
| `errorMessage` | string \| null | |
| `responseJson` | JSON | Audit payload (no secrets) |
| `platformPostId` / `platformPostUrl` | string \| null | |
| `idempotencyKey` | string | Unique — retries reuse or mint new keys intentionally |
| `reconciledFromAttemptId` | string \| null | Set when resolving an ambiguous attempt |

**Ambiguous rule:** if the last outcome is `ambiguous`, the next action must be **reconcile** (establish platform state) before a new send. Reconcile either marks the publication `published` (post found — do not resend) or `failed` (safe to retry).

### Publish modes
1. **manual** — operator copies text + campaign link, downloads materials, posts on the channel, then saves `postUrl` (`confirmationKind = manual`).
2. **test** — local simulator can force success / failure / ambiguous (no Meta network calls).
3. **connected** — server-side official Meta Graph API. Tokens never leave the server. Live sends only when `META_ALLOW_LIVE_SENDS=true` against the labelled test account. See `docs/meta-publishing.md`.

### Analytics handoff
When a post id/URL is registered (manual save, test success, or platform confirm), the publishing module writes an `analytics_handoffs` row for agent 4 (`GET /api/analytics/handoffs`).

### Link
Tagged outbound links used for source A (inbound attribution).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK (= campaign link id in URLs) |
| `campaignId` | string | FK → Campaign |
| `publicationId` | string \| null | FK → Publication |
| `destinationUrl` | string | Final redirect / destination |
| `utmSource` / `utmMedium` / `utmCampaign` / `utmContent` / `utmTerm` | string \| null | |
| `label` | string \| null | Human label |
| `createdAt` | datetime | |

Tagged app URL shape (local):

```text
/r/{linkId}?utm_source=…&utm_medium=…&utm_campaign=…
```

### ConversionEvent
Atomic result events from either result source.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `campaignId` | string \| null | Resolved campaign when known |
| `linkId` | string \| null | Present for source A |
| `publicationId` | string \| null | Optional |
| `source` | enum | `tagged_link` \| `din_next` |
| `eventType` | string | e.g. `click`, `price_view`, `inquiry_submitted` |
| `occurredAt` | datetime | Event time |
| `payload` | JSON | Source-specific fields |
| `idempotencyKey` | string \| null | Dedup key |
| `createdAt` | datetime | Ingest time |

### Measurement
Aggregated / derived metrics for a campaign (and optionally a publication).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | PK |
| `campaignId` | string | FK → Campaign |
| `publicationId` | string \| null | Optional scope |
| `metric` | string | e.g. `clicks`, `price_views`, `inquiries` |
| `value` | number | |
| `windowStart` / `windowEnd` | datetime \| null | Aggregation window |
| `source` | enum | `tagged_link` \| `din_next` \| `mixed` |
| `updatedAt` | datetime | |

## Result sources (independent)

### A — Tagged app links (UTM / campaign link ids)
- This app issues `Link` records and `/r/{linkId}` redirects.
- Inbound clicks (and optional client beacons) create `ConversionEvent` with `source = tagged_link`.
- Does **not** require Meta accounts or paid APIs.

### B — DIN Next reported events
- DIN Next (or a local simulator) POSTs `price_view` and `inquiry_submitted` (and related) events to this app.
- Creates `ConversionEvent` with `source = din_next`.
- See `docs/din-next-integration.md`.

Sources A and B must remain independently ingestible and reportable. Measurements may later combine them (`source = mixed`) without coupling ingest paths.

## Demo vs real data
- Demo rows set `Campaign.isDemo = true` and live under `seed/demo/`.
- Production DB file: `data/campaigns.sqlite` (created empty on first run; never commit demo as “real”).
- Seed script only writes demo campaigns unless explicitly overridden.

## Status independence rule
Updating a publication from `draft` → `published` must not change campaign status. Pausing a campaign must not auto-end publications unless a future product rule explicitly says so (out of scope for skeleton).
