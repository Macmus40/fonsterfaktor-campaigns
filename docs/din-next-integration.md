# DIN Next integration (minimal target)

DIN Next / the konfigurator remains a **separate** repository. Do not implement this integration inside the konfigurator in the current phase. This app owns the ingest contract and a local simulator.

## Two independent result sources

| Source | Owner | What it measures |
| --- | --- | --- |
| **A — Tagged app links** | This app (`/r/{linkId}`, UTM params) | Clicks / visits attributed to a campaign link |
| **B — DIN Next events** | DIN Next posts → this app | `price_view`, `inquiry_submitted` (and related) |

Neither source blocks the other. Analytics may join them later by `campaignId` / `linkId`.

## Ingest endpoint (this app)

```http
POST /api/events/din-next
Content-Type: application/json
X-FF-Ingest-Secret: <DIN_NEXT_INGEST_SECRET>
```

When `DIN_NEXT_INGEST_SECRET` is set, the header (or `Authorization: Bearer`) is required. Contact fields in `payload` are stripped. `inquiry_submitted` also upserts `din_next_inquiries` (id + attribution + status only).

### Payload (minimal)

```json
{
  "eventType": "price_view",
  "occurredAt": "2026-11-16T10:00:00.000Z",
  "campaignSlug": "svart-skjutparti",
  "linkId": optional_link_id,
  "idempotencyKey": "din-next:optional-unique-key",
  "payload": {
    "product": "Svart skjutparti",
    "configuratorUrl": "https://example.test/konfigurator?campaign=svart-skjutparti",
    "priceSek": 42900,
    "inquiryId": null
  }
}
```

Supported `eventType` values for skeleton: `price_view`, `inquiry_submitted`.

### Response

```json
{ "ok": true, "eventId": "…" }
```

Duplicate `idempotencyKey` → `200` with the existing event (no second insert).

## Minimal target work on DIN Next (later, outside this phase)

1. When a visitor arrives with `utm_*` / campaign link id, keep that attribution in session/storage.
2. On **price view**, POST `price_view` to this app’s ingest URL with campaign/link attribution.
3. On **inquiry submit**, POST `inquiry_submitted` with the same attribution plus inquiry id.
4. Prefer fire-and-forget with retry + idempotency key; failures must not break the configurator UX.

Keep that code in the DIN Next repo only when explicitly scheduled. Until then use the local simulator.

## Local simulator (ships with this app)

| Entry | Path |
| --- | --- |
| API | `POST /api/simulate/din-next` — posts sample events into ingest |
| CLI | `npm run simulate:din-next` → `scripts/simulate-din-next.ts` |

Simulator talks only to this app’s localhost ingest. No Meta accounts, no paid APIs, no changes to the konfigurator checkout.
