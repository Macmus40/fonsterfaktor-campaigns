# Wdrożenie (Vercel) — przygotowanie

Aplikacja jest osobnym projektem Next.js. **Decyzję o włączeniu płatnego hostingu / produkcji podejmuje właściciel.** Ten dokument przygotowuje wdrożenie.

## 1. Supabase (osobny projekt)

1. Utwórz projekt Supabase.
2. Uruchom migrację `supabase/migrations/20261116120000_init.sql`.
3. Utwórz użytkownika panelu w Authentication.
4. Sprawdź bucket `campaign-media` (prywatny).

## 2. Vercel

1. Import repo `Macmus40/fonsterfaktor-campaigns`.
2. Framework: Next.js (wykrywany automatycznie).
3. Environment variables (Production / Preview):

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `DIN_NEXT_INGEST_SECRET` | Shared with DIN Next |
| `CRON_SECRET` | For `/api/jobs/publish-due` |
| `APP_ORIGIN` | Public site URL |
| `PUBLISH_JOB_MODE` | `simulate` until Meta live; then `live` |
| Meta vars | See `.env.example` when enabling connected publish |

4. `vercel.json` rejestruje Cron co 5 minut na `/api/jobs/publish-due` (wymaga planu z Cron — właściciel decyduje).
5. Deploy. Auth redirect URLs w Supabase: dodaj domenę Vercel do Allowed Redirect URLs.

## 3. DIN Next

Konfigurator woła `POST https://<vercel-domain>/api/events/din-next` z nagłówkiem sekretu. Nie wysyła PII kontaktowych.

## 4. GitHub

Kod i migracje żyją w `Macmus40/fonsterfaktor-campaigns` (public). Nie commituj `.env`.
