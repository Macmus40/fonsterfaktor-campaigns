# FönsterFaktor Campaigns

Internal panel to create, publish, and analyze Drutex product campaigns sold in Sweden. DIN Next is an external traffic destination only — this repository does not modify the konfigurator.

## Stack

- Next.js (App Router) + TypeScript
- SQLite via `better-sqlite3` + Drizzle (`data/campaigns.sqlite`)
- No Meta accounts, no paid APIs required for local use

## Quick start

```bash
npm install
npm run seed:demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### DIN Next simulator

With the dev server running:

```bash
npm run simulate:din-next
```

Or `POST /api/simulate/din-next` with optional JSON `{ "campaignSlug": "svart-skjutparti" }`.

### Links + analytics acceptance

```bash
npm run seed:demo
npm run acceptance:analytics
npm run dev
```

Open [http://localhost:3000/analytics](http://localhost:3000/analytics). Details: [`docs/analytics-acceptance.md`](docs/analytics-acceptance.md).

## Docs

- [`docs/campaign-contract.md`](docs/campaign-contract.md) — domain models
- [`docs/din-next-integration.md`](docs/din-next-integration.md) — result source B
- [`docs/configurator-integration.md`](docs/configurator-integration.md) — real konfigurator checklist
- [`docs/analytics-acceptance.md`](docs/analytics-acceptance.md) — links/analytics acceptance
- [`docs/agent-ownership.md`](docs/agent-ownership.md) — parallel agent file ownership

## Demo vs real

- Demo fixtures: `seed/demo/` (`isDemo = true`)
- Runtime DB: `data/campaigns.sqlite` (gitignored; starts empty until seed/migrate)
