# Agent file ownership (parallel agents 2–4)

Scaffold (agent 1) owns bootstrap, contract docs, shared schema/types, seed demo, and the DIN Next simulator stubs. Agents 2–4 extend modules without editing each other’s owned paths unless integrating at the listed seams.

## Shared (do not fork — extend carefully)

| Path | Purpose |
| --- | --- |
| `docs/campaign-contract.md` | Domain models & rules |
| `docs/din-next-integration.md` | Result source B contract |
| `docs/agent-ownership.md` | This map |
| `src/lib/types.ts` | Shared TypeScript interfaces / enums |
| `src/lib/db/schema.ts` | Drizzle SQLite tables |
| `src/lib/db/client.ts` | DB connection (`data/campaigns.sqlite`) |
| `seed/demo/**` | Demo fixtures (agent 1 seeds; others append only with coordination) |
| `data/` | Runtime SQLite file (gitignored except `.gitkeep`) |

**Shared types to import:** `Campaign`, `Material`, `ContentVariant`, `Publication`, `Link`, `ConversionEvent`, `Measurement`, and status enums from `src/lib/types.ts`. Prefer schema inference from `src/lib/db/schema.ts` when adding columns — update types + contract in the same PR.

## Agent 2 — Campaign authoring (product, materials, Swedish variants)

**Owns**
- `src/app/campaigns/**`
- `src/app/api/campaigns/**`
- `src/components/campaigns/**`
- `src/lib/campaigns/**`

**Responsibilities:** CRUD for campaigns, materials, content variants; status transitions for campaigns; demo “Svart skjutparti” editing UX.

**Must not:** mutate publication publish flows (agent 3) or measurement rollups (agent 4) except calling shared types.

## Agent 3 — Publications & tagged links (source A)

**Owns**
- `src/app/publications/**`
- `src/app/api/publications/**`
- `src/app/api/links/**`
- `src/app/r/[linkId]/**` (redirect + click event)
- `src/app/api/events/inbound/**`
- `src/components/publications/**`
- `src/lib/publications/**`
- `src/lib/links/**`

**Responsibilities:** channel publications (independent status), link minting with UTM / link ids, inbound click ingest (`source = tagged_link`).

**Integrates after:** agent 2 can create a campaign + content variant + materials to attach.

## Agent 4 — Analytics, measurements, DIN Next ingest (source B)

**Owns**
- `src/app/analytics/**`
- `src/app/api/events/din-next/**`
- `src/app/api/measurements/**`
- `src/app/api/simulate/din-next/**` (extend simulator)
- `src/components/analytics/**`
- `src/lib/analytics/**`
- `src/lib/events/**`
- `scripts/simulate-din-next.ts` (extend)

**Responsibilities:** ingest DIN Next events, measurements rollup, panel views for results from sources A + B independently and combined.

**Integrates after:** agent 3 links exist (for optional `linkId` on DIN events); agent 2 campaign slug for attribution.

## Seed / test data ownership

| Asset | Owner |
| --- | --- |
| `seed/demo/svart-skjutparti.json` | Agent 1 (create); agent 2 may extend materials/texts |
| `scripts/seed-demo.ts` | Agent 1; others add hooks via exported helpers in `src/lib/db/` |
| Synthetic inbound clicks | Agent 3 test helpers under `src/lib/links/test-fixtures.ts` |
| Synthetic DIN Next payloads | Agent 4 under `src/lib/events/test-fixtures.ts` |

Never write demo rows with `isDemo = false`. Production path starts empty aside from migrations.

## Integration order

1. **Agent 1 (done in skeleton):** schema, contract, seed, empty panel, simulator stub, inbound + DIN ingest stubs.
2. **Agent 2:** authoring UI/API against shared schema.
3. **Agent 3:** publications + `/r/[linkId]` + inbound events (needs campaign ids from 2).
4. **Agent 4:** harden DIN ingest, measurements, analytics UI (needs campaigns from 2; optional link ids from 3).

Contract changes that affect more than one agent → update `docs/campaign-contract.md` + `src/lib/types.ts` + `src/lib/db/schema.ts` first, then notify sibling agents.
