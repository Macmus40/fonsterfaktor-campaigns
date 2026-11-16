# Agent handoff — FönsterFaktor Campaigns

## Repository
- **Remote:** https://github.com/Macmus40/fonsterfaktor-campaigns.git
- **Visibility:** public (do not change)
- **Base branch:** `main`
- **Platform:** Next.js → Vercel; data/auth/media → separate Supabase project

## Contract
- Path: `docs/campaign-contract.md`
- First historical landing (SQLite era): `f5a3088bea6c1d14ba010983da3396756f834f29`
- Supabase foundation updates the same file on branch `cursor/supabase-foundation-b1fe`

## Module branches (agents 2–4)
| Agent | Branch |
| --- | --- |
| 2 — content | `feat/campaign-content` |
| 3 — publishing | `feat/campaign-publishing` |
| 4 — analytics | `feat/campaign-analytics` |

Use repository helpers (`src/lib/campaigns/store`, jobs, events) — do not bind new features to SQLite only.

## Missing for live Supabase probes
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` + migration applied + Auth user.
