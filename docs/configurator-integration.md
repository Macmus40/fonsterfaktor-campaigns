# Integracja z prawdziwym konfiguratorem (DIN Next)

Krótka specyfikacja dla zespołu konfiguratora. Ta aplikacja kampanii **nie** przechowuje danych kontaktowych.

## Cel

1. Każda publikacja ma własny tagged link `/r/{linkId}` prowadzący na ustaloną domenę konfiguratora.
2. Parametry potrzebne do otwarcia właściwego produktu (`product`, `finish`, `campaign`, …) pozostają w URL po przekierowaniu.
3. Konfigurator odnotowuje atrybucję (`ff_link_id`, `ff_publication_id`, `utm_*`) i wysyła zdarzenia konwersji z powrotem.

## Przekierowanie (źródło A — ta aplikacja)

Przykład docelowego URL po `/r/{linkId}`:

```text
https://<domena-konfiguratora>/...?product=skjutparti&finish=svart&campaign=svart-skjutparti
  &utm_source=meta&utm_medium=social&utm_campaign=svart-skjutparti&utm_content=photo-a
  &ff_link_id=lnk_…&ff_publication_id=pub_…&ff_variant=A
```

Konfigurator powinien zapisać `ff_link_id` (i opcjonalnie publication/variant) w sesji / storage na czas wizyty.

## Zdarzenia (źródło B — konfigurator → kampanie)

```http
POST https://<campaigns-host>/api/events/din-next
Content-Type: application/json
X-FF-Ingest-Secret: <DIN_NEXT_INGEST_SECRET>
```

### `price_view`

```json
{
  "eventType": "price_view",
  "occurredAt": "2026-11-16T12:00:00.000Z",
  "campaignSlug": "svart-skjutparti",
  "linkId": "lnk_…",
  "publicationId": "pub_…",
  "idempotencyKey": "din:<session>:<configHash>:price_view",
  "payload": {
    "product": "Svart skjutparti",
    "priceSek": 42900,
    "configuratorUrl": "https://…"
  }
}
```

### `inquiry_submitted`

```json
{
  "eventType": "inquiry_submitted",
  "occurredAt": "2026-11-16T12:05:00.000Z",
  "campaignSlug": "svart-skjutparti",
  "linkId": "lnk_…",
  "publicationId": "pub_…",
  "idempotencyKey": "din:<inquiryId>:inquiry_submitted",
  "payload": {
    "inquiryId": "inq_123",
    "product": "Svart skjutparti"
  }
}
```

**Nie wysyłaj** e-maila, telefonu, imienia ani adresu — dane kontaktowe zostają po stronie konfiguratora. Payload jest dodatkowo sanitizowany po stronie odbioru.

## Idempotencja i bezpieczeństwo

- Ten sam `idempotencyKey` → `200 { "deduped": true }` bez podwójnego liczenia.
- Ustaw `DIN_NEXT_INGEST_SECRET` w obu środowiskach; bez sekretu ingest jest otwarty tylko lokalnie (dev).
- Wywołania fire-and-forget + retry; błąd ingestu nie może blokować UX konfiguratora.

## Brak podłączenia

Dopóki konfigurator nie wysyła zdarzeń, raport kampanii oznacza status:

**„brak pomiaru konwersji”**

Symulator lokalny (`npm run simulate:din-next` / `POST /api/simulate/din-next`) służy wyłącznie do testów tej aplikacji.
