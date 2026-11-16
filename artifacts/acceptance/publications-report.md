# Acceptance report — publications (Agent 3)

**Timezone:** Europe/Stockholm  
**Demo campaign:** Svart skjutparti  
**Date (Stockholm):** 2026-11-16

## Checks

| Check | Result |
| --- | --- |
| Schedule Facebook Page + Instagram | pass |
| Test-mode success send | pass (`confirmationKind = test`) |
| Test-mode failure + retry | pass |
| Ambiguous → reconcile before retry | pass (duplicate send blocked) |
| Manual package (text, media, link) | pass |
| Unit tests `npm test` | 6/6 pass |
| `npm run test:acceptance:publications` | pass |

## Channel status (server env without Meta secrets)

| Channel | Status | Day-1 |
| --- | --- | --- |
| `facebook_page` | `blocked_missing_credentials` | yes |
| `instagram` | `blocked_missing_credentials` (prepared; not day-1 live test) | no |

## Artifacts

- Calendar screenshot (demo data): `artifacts/acceptance/calendar-europe-stockholm.webp`
- Machine JSON: `artifacts/acceptance/acceptance-publications.json`

## Reproduce

```bash
npm install
npm run seed:demo
npm test
npm run test:acceptance:publications
npm run dev
# open /publications
```
