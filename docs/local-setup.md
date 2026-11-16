# Lokalne uruchomienie (Next.js + Supabase)

## Wymagania

1. Node.js 20+
2. Osobny projekt **Supabase** (Postgres + Auth + Storage)
3. Klon https://github.com/Macmus40/fonsterfaktor-campaigns.git

## Kroki

```bash
git clone https://github.com/Macmus40/fonsterfaktor-campaigns.git
cd fonsterfaktor-campaigns
npm install
cp .env.example .env.local
```

Uzupełnij w `.env.local` (wartości z Supabase → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer — seed, cron, signed upload)
- `DIN_NEXT_INGEST_SECRET`
- `CRON_SECRET`
- `APP_ORIGIN=http://localhost:3000`

### Migracje

W SQL Editor projektu Supabase wklej i uruchom:

`supabase/migrations/20261116120000_init.sql`

(albo `supabase link` + `supabase db push`, jeśli używasz CLI).

### Auth

Authentication → Users → Add user (e-mail + hasło operatora panelu).

### Start

```bash
npm run dev
```

- Panel: http://localhost:3000/login → `/publications`
- Publiczny redirect: `/r/{linkId}`
- Job lokalny: `PUBLISH_JOB_MODE=simulate npm run jobs:publish-due`
- Sonda fundamentu: `npm run probe:foundation`

## Prototyp SQLite

Historia gita zachowuje warstwę SQLite. Awaryjnie:

```bash
STORAGE_DRIVER=sqlite npm run seed:demo
STORAGE_DRIVER=sqlite npm run jobs:publish-due
```

Moduły powinny używać `src/lib/campaigns/store` / repository — nie wracać do bezpośredniego SQLite w nowych feature’ach.
