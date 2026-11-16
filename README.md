# FönsterFaktor Campaigns

Internal panel for Drutex campaigns in Sweden. **Next.js on Vercel** + separate **Supabase** project (Postgres, Auth, private Storage). DIN Next is an external konfigurator only.

GitHub: https://github.com/Macmus40/fonsterfaktor-campaigns

## Quick start

See [`docs/local-setup.md`](docs/local-setup.md) and [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

```bash
npm install
cp .env.example .env.local   # fill Supabase + secrets
# apply supabase/migrations/20261116120000_init.sql in Supabase SQL editor
npm run dev
```

Foundation probe (reports missing Supabase config explicitly):

```bash
npm run probe:foundation
```

Scheduled publications (panel can be closed):

```bash
PUBLISH_JOB_MODE=simulate npm run jobs:publish-due
```

## Docs

- [`docs/campaign-contract.md`](docs/campaign-contract.md) — domain + auth matrix + scheduler
- [`docs/local-setup.md`](docs/local-setup.md) — local run
- [`docs/deploy-vercel.md`](docs/deploy-vercel.md) — deployment prep (owner decides on paid hosting)
- [`docs/SQLITE_PROTOTYPE.md`](docs/SQLITE_PROTOTYPE.md) — SQLite history note
- [`docs/din-next-integration.md`](docs/din-next-integration.md)
- [`docs/meta-publishing.md`](docs/meta-publishing.md)

## Visibility

Repository stays **public**. Never commit `.env`, tokens, local DB, private media, or client PII.
