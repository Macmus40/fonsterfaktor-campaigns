# Raport odbioru — Agent 4 (analytics)

**Branch:** `feat/campaign-analytics`  
**Repo:** https://github.com/Macmus40/fonsterfaktor-campaigns.git  
**Base:** `main` @ `468ba15` (contract first landed `f5a3088`)

## Scenariusz

1. `npm run seed:demo` — dwa posty (wariant A/B) z osobnymi tagged linkami
2. `npm run acceptance:analytics` — przejścia, wyceny, zapytania, duplikat zdarzenia
3. Raport `/analytics` — A ma więcej przejść, B więcej zapytań

## Wynik (demo)

| Publikacja | Przejścia | Podglądy botów | Wyceny | Zapytania |
| --- | ---: | ---: | ---: | ---: |
| Wariant A | 20 | 1 | 2 | 1 |
| Wariant B | 8 | 0 | 6 | 4 |

Duplikat `inquiry_submitted` z tym samym `idempotencyKey` → `deduped: true` (B nadal 4 zapytania).

## Artefakty

- `artifacts/acceptance/analytics_report_svart_skjutparti.webp`
- `artifacts/acceptance/analytics_weekly_summary.webp`

## Uruchomienie

```bash
rm -f data/campaigns.sqlite data/campaigns.sqlite-*
npm run seed:demo
npm run acceptance:analytics
npm test -- tests/analytics.test.ts
```
