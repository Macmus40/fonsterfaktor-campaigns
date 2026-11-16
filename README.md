# FönsterFaktor Campaigns

Internal panel to create, publish, and analyze Drutex product campaigns sold in Sweden. DIN Next is an external traffic destination only — this repository does not modify the konfigurator.

## Stack

- Next.js (App Router) + TypeScript
- SQLite via `better-sqlite3` + Drizzle (`data/campaigns.sqlite`)
- No Meta accounts, no paid APIs required for local use

## Quick start

```bash
npm install
cp .env.example .env.local   # names only — fill locally, never commit secrets
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

## Publications (agent 3)

- UI: `/publications` and `/publications/[campaignId]` — calendar in **Europe/Stockholm**
- Modes: `manual` (copy package + save post URL), `test` (simulate success/failure/ambiguous), `connected` (Meta Graph API, server tokens only)
- Ambiguous sends require `POST /api/publications/:id/reconcile` before retry
- Channel status: `GET /api/meta/status` — Facebook Page day-1; Instagram prepared but out of day-1 test scope without a professional IG account
- Acceptance: `npm run test:acceptance:publications` · unit: `npm test`
- Meta notes: [`docs/meta-publishing.md`](docs/meta-publishing.md)

## Analytics (agent 4)

- UI: `/analytics` — report by channel / publication / variant + weekly summary
- Tagged redirects: `/r/{linkId}` (bots → `link_preview`; humans → `click` / przejścia ≠ unique customers)
- DIN Next ingest: `POST /api/events/din-next` (idempotent; contact fields stripped)
- Manual platform stats: `POST /api/analytics/platform-stats` (`dataSource=manual`)
- Acceptance: `npm run acceptance:analytics` · details [`docs/analytics-acceptance.md`](docs/analytics-acceptance.md)
- Real konfigurator checklist: [`docs/configurator-integration.md`](docs/configurator-integration.md)

## Docs

- [`docs/campaign-contract.md`](docs/campaign-contract.md) — domain models
- [`docs/din-next-integration.md`](docs/din-next-integration.md) — result source B
- [`docs/configurator-integration.md`](docs/configurator-integration.md) — real konfigurator checklist
- [`docs/analytics-acceptance.md`](docs/analytics-acceptance.md) — links/analytics acceptance
- [`docs/agent-ownership.md`](docs/agent-ownership.md) — parallel agent file ownership
- [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md) — base branch / contract SHA
- [`docs/meta-publishing.md`](docs/meta-publishing.md) — Facebook Page + Instagram API scope

## Demo vs real

- Demo fixtures: `seed/demo/` + `public/demo/` (`isDemo = true`)
- Runtime DB: `data/campaigns.sqlite` (gitignored; starts empty until seed/migrate)
- Secrets / local DB / private media / client data: see `.gitignore`; variable names only in `.env.example`
