# FönsterFaktor Campaigns

Internal panel to create, publish, and analyze Drutex product campaigns sold in Sweden.

## Publications (agent 3)

- UI: `/publications` and `/publications/[campaignId]` — calendar in **Europe/Stockholm**
- Modes: `manual` (copy package + save post URL), `test` (simulate success/failure/ambiguous), `connected` (Meta Graph API, server tokens only)
- Ambiguous sends require `POST /api/publications/:id/reconcile` before retry
- Channel status: `GET /api/meta/status` — Facebook Page day-1; Instagram prepared but out of day-1 test scope without a professional IG account
- Acceptance: `npm run test:acceptance:publications` · unit: `npm test` DIN Next is an external traffic destination only — this repository does not modify the konfigurator.

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

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/campaigns](http://localhost:3000/campaigns) for authoring.

### Content generation (agent 2)

Swedish proposals use **local templates + tags** (no paid API). Optional local model:

```bash
export LOCAL_LLM_URL=http://127.0.0.1:11434/api/generate
export LOCAL_LLM_MODEL=llama3.2
export LOCAL_MATERIAL_ANALYSIS=1  # optional provenance tag
```

Demo assets: `public/demo/svart-skjutparti-fasad.jpg`, `public/demo/svart-skjutparti-open.mp4`. Limitations: `docs/content-flow-limitations.md`.

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

## Docs

- [`docs/campaign-contract.md`](docs/campaign-contract.md) — domain models
- [`docs/din-next-integration.md`](docs/din-next-integration.md) — result source B
- [`docs/agent-ownership.md`](docs/agent-ownership.md) — parallel agent file ownership
- [`docs/meta-publishing.md`](docs/meta-publishing.md) — Facebook Page + Instagram API scope

## Demo vs real

- Demo fixtures: `seed/demo/` (`isDemo = true`)
- Runtime DB: `data/campaigns.sqlite` (gitignored; starts empty until seed/migrate)
