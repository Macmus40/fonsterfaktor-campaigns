# SQLite prototype (archived)

Before the Supabase foundation, durable data lived in `data/campaigns.sqlite` (`better-sqlite3` + Drizzle).

- Keep using git history to inspect that layer; do not delete those commits.
- Representative tip before this foundation branch: see `main` history / publishing merge commits that still ship the SQLite client under `src/lib/db/client.ts`.
- Runtime escape hatch: `STORAGE_DRIVER=sqlite` for offline module work only.
- New features must go through repository helpers (`src/lib/campaigns/store.ts`, jobs, events) so Supabase remains the target.
