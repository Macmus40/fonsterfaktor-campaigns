# Campaign contract

Domain + platform contract for **FönsterFaktor Campaigns** — internal panel for Sweden-market Drutex product campaigns.

DIN Next / the product konfigurator is an **external** traffic and conversion destination. This app does not store inquiry contact PII coming from DIN Next.

## Platform (target)

| Piece | Choice |
| --- | --- |
| App | Separate **Next.js** (App Router) project |
| Hosting | **Vercel** (owner decides when to enable paid hosting) |
| Database | **Supabase Postgres** (durable campaigns, publications, results, direct contacts) |
| Auth | **Supabase Auth** — panel operators must be signed in |
| Media | **Supabase Storage** private bucket `campaign-media` — direct client uploads with signed URLs |
| Code & migrations | GitHub [`Macmus40/fonsterfaktor-campaigns`](https://github.com/Macmus40/fonsterfaktor-campaigns) |

### SQLite prototype (archived in git history)

Local SQLite (`data/campaigns.sqlite` via `better-sqlite3`) was the first durable store. That prototype remains reachable in git history (e.g. tip before Supabase foundation on `main`). Runtime default becomes Supabase; `STORAGE_DRIVER=sqlite` may be used only for offline module work until migrations are applied. Modules must talk to the **repository layer**, not to a driver directly.

## Core models

### Campaign
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `slug` | text | Stable short id for links |
| `name` | text | Display name (e.g. “Svart skjutparti”) |
| `product` | text | Drutex product / family |
| `goal` | text | Campaign goal |
| `destination_url` | text | Usually DIN Next konfigurator URL (+ product params) |
| `market` | text | Default `SE` |
| `region` | text \| null | |
| `status` | enum | `draft` \| `ready` \| `active` \| `paused` \| `archived` |
| `starts_at` / `ends_at` | timestamptz \| null | |
| `is_demo` | boolean | Demo seed vs real |
| `created_at` / `updated_at` | timestamptz | |

**Cardinality:** one campaign → many materials, content variants, publications, links, conversion events, measurements, platform stats.

**Independence:** campaign `status` ⊥ publication `status`.

### Material
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `campaign_id` | uuid | FK |
| `kind` | enum | `image` \| `video` |
| `title` | text | |
| `storage_path` | text \| null | Path inside private bucket (preferred) |
| `url` | text \| null | Legacy/public URL or signed-URL cache hint — not a long-lived secret |
| `mime_type` | text \| null | |
| `width` / `height` / `duration_sec` | number \| null | |
| `sort_order` | int | |
| `created_at` | timestamptz | |
| `created_by` | uuid \| null | Auth user who uploaded |

### ContentVariant
Swedish text variants (`locale` default `sv-SE`). Status: `draft` \| `approved` \| `retired`.

### Publication
Channel placement; status independent of campaign.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `campaign_id` | uuid | FK |
| `channel` | text | Day-1: `facebook_page`; also `instagram`, … |
| `content_variant_id` | uuid \| null | Must be `approved` before send |
| `material_ids` | uuid[] | |
| `status` | enum | `draft` \| `scheduled` \| `publishing` \| `published` \| `paused` \| `ended` \| `failed` \| `ambiguous` |
| `scheduled_at` | timestamptz \| null | UTC; UI = **Europe/Stockholm** |
| `publish_mode` | enum | `manual` \| `test` \| `connected` |
| `confirmation_kind` | enum \| null | `manual` \| `test` \| `platform` |
| `post_url` / `external_id` | text \| null | |
| `campaign_link_id` | uuid \| null | Tagged link for this publication |
| `last_attempt_id` | uuid \| null | |
| `published_at` / `ended_at` | timestamptz \| null | |

### PublicationAttempt
Per-send history (`success` \| `failure` \| `ambiguous` \| `pending` \| `skipped`) with unique `idempotency_key`. Ambiguous → reconcile before retry.

### Link
Tagged outbound `/r/{linkId}` (source A). Preserves product-opening query params on redirect. Human hits = `click` (transitions, **not** unique customers); known bots = `link_preview`.

### ConversionEvent
Atomic results from source A (`tagged_link`) or B (`din_next`). Deduped by `idempotency_key`.

### DinNextInquiry (result of inquiry_submitted)
Stores **identifier + attribution + status only**. Contact PII stays in DIN Next.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK (this app) |
| `external_inquiry_id` | text | ID from DIN Next |
| `campaign_id` / `link_id` / `publication_id` | uuid \| null | Attribution |
| `status` | enum | `received` \| `synced` \| `closed` \| `error` |
| `occurred_at` | timestamptz | |
| `payload` | jsonb | Non-PII metadata only (product, price, …) |
| `idempotency_key` | text | Unique |

### DirectContact
Contacts captured **inside this panel** (not DIN Next inquiries).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `campaign_id` | uuid \| null | Optional |
| `email` / `phone` / `name` | text \| null | Panel-sourced only |
| `source` | text | e.g. `manual_panel` |
| `notes` | text \| null | |
| `created_by` | uuid \| null | Auth user |
| `created_at` | timestamptz | |

### PlatformStat / Measurement
Reach, interactions, spend (manual or verified API) and rolled-up metrics. Missing DIN Next events → UI label **„brak pomiaru konwersji”**.

## Endpoint access matrix

| Surface | Auth | Notes |
| --- | --- | --- |
| `GET /r/{linkId}` | **Public** | Redirect + transition/preview event |
| `POST /api/events/inbound` | **Public** (optional rate-limit) | Source A beacons |
| `POST /api/events/din-next` | **Shared secret** | `X-FF-Ingest-Secret` or `Authorization: Bearer` = `DIN_NEXT_INGEST_SECRET` |
| `POST /api/simulate/din-next` | **Logged-in** (or secret in local/dev) | Simulator |
| `GET/POST /api/jobs/publish-due` | **Cron secret** | `Authorization: Bearer CRON_SECRET` or `x-cron-secret` |
| `/login` | Public | Supabase Auth email magic link / password |
| `/`, `/publications/**`, `/analytics/**`, `/campaigns/**` | **Logged-in** | Panel UI |
| `GET/POST /api/campaigns/**`, `/api/publications/**`, `/api/links` (mutations), `/api/media/**`, `/api/contacts/**` | **Logged-in** | Service role only on server after session check |
| `GET /api/meta/status` | **Logged-in** | |

### DIN Next event authentication
1. Prefer shared secret header (`DIN_NEXT_INGEST_SECRET`).
2. Strip contact fields from payload on ingest.
3. For `inquiry_submitted`, upsert `din_next_inquiries` by `external_inquiry_id` / idempotency key; never store email/phone/name from DIN Next.

## Scheduled publications (panel closed)

1. Operator sets `publications.scheduled_at` + `status = scheduled` (+ mode).
2. Job **`publish-due`** selects rows where `scheduled_at <= now()` and `status = scheduled`, marks `publishing`, runs the same send path as the panel (`test` → simulate; `connected` → Meta; `manual` → skip auto-send, leave reminder attempt `skipped`).
3. Attempts + final status are written to Postgres so the job is safe if the browser is closed.
4. **Production:** Vercel Cron hits `/api/jobs/publish-due` with `CRON_SECRET`.
5. **Local v1:** `npm run jobs:publish-due` runs the identical function; `PUBLISH_JOB_MODE=simulate` forces test-mode outcomes without Meta.

## Result sources

- **A — Tagged links:** `/r/{linkId}` → `conversion_events` (`tagged_link`).
- **B — DIN Next:** `price_view` / `inquiry_submitted` → `conversion_events` (+ `din_next_inquiries` for inquiries).

## Demo vs real
- Demo rows: `is_demo = true`, fixtures under `seed/demo/`.
- Never commit real secrets; `.env.example` lists names only.
- Production data lives in the linked Supabase project.

## Status independence
Updating a publication must not auto-change campaign status (and vice versa) unless a future product rule says so.
