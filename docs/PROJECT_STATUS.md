# FönsterFaktor Campaigns — status projektu (audyt)

| Pole | Wartość |
| --- | --- |
| Repo | https://github.com/Macmus40/fonsterfaktor-campaigns |
| Data audytu | 2026-11-16 12:37 CET (Europe/Stockholm) |
| Branch raportu | `audit/project-status` |
| Stan przed audytem | zachowany — zmiany wyłącznie w tym pliku |
| Metoda | kod + GitHub API + lokalne próby na danych demo (bez publikacji Meta, bez deployu, bez migracji produkcyjnych, bez merge) |

---

## Cztery odpowiedzi

### 1. Co mogę uruchomić i przetestować teraz? Z którego brancha i jaką komendą?

**Najszerszy działający panel demo (SQLite):** branch `feat/campaign-analytics` @ `e43dc90972c270de0aaca45fbb5e2739848b6c6a` (publikacje z `main` + linki + raport).

```bash
git fetch origin
git checkout feat/campaign-analytics   # lub: git checkout e43dc90
npm install
rm -f data/campaigns.sqlite data/campaigns.sqlite-*
npm run seed:demo
npm run acceptance:analytics
npm run test:acceptance:publications
npm test
npm run build
npm run dev
# http://localhost:3000/
# http://localhost:3000/publications
# http://localhost:3000/analytics
```

**Authoring szwedzkich tekstów (+ publikacje z main):** `feat/campaign-content` @ `3a2374ba6748953460f0e3c738a1013af81fc6fa`

```bash
git checkout feat/campaign-content
npm install && npm run seed:demo && npm run dev
# http://localhost:3000/campaigns
```

**Fundament Supabase (Auth / Storage / cron):** `cursor/supabase-foundation-b1fe` @ `5491220e345b40d3a5650572f6e70be52facb335` — bez projektu Supabase tylko sonda i escape hatch SQLite:

```bash
git checkout cursor/supabase-foundation-b1fe
npm install
npm run probe:foundation
STORAGE_DRIVER=sqlite npm run probe:foundation
```

### 2. Co jest już w `origin/main`, a co istnieje na branchach lub tylko lokalnie?

**`origin/main` @ `468ba15292fcf21dfc2d987b765005731306a969`** zawiera:

- szkielet Next.js + SQLite (`better-sqlite3` / Drizzle, `data/campaigns.sqlite`)
- kontrakt domenowy, seed demo „Svart skjutparti”
- **moduł publikacji** (kalendarz Europe/Stockholm, tryby `manual` / `test` / `connected`, reconcile, Meta Graph stubs)
- stuby API kampanii / eventów / redirect `/r/[linkId]`
- **nie** ma UI authoringu treści, pełnej analityki ani warstwy Supabase Auth/Storage

**Na zdalnych branchach (nie w main):**

| Branch | SHA | Względem `origin/main` | Uwagi |
| --- | --- | --- | --- |
| `feat/campaign-publishing` | `468ba15` | = main | alias / handoff |
| `cursor/publications-planning-c851` | `c503444` | behind 3 | **aktualny default branch GitHuba** (błędny); treść już w main przez PR #1 |
| `feat/campaign-analytics` / `cursor/feat-campaign-analytics-b1fe` | `e43dc90` | ahead 1 | kanoniczna analityka; PR #3 |
| `cursor/links-analytics-module-b1fe` | `55120bb` | behind 5, konflikt | **porzucony duplikat** analityki ze skeletonu; PR #2 CONFLICTING |
| `cursor/campaign-content-flow-e291` | `cdd6d73` | ahead 1 | content na main; PR #4 |
| `feat/campaign-content` | `3a2374b` | ahead 2 | content + artefakty acceptance |
| `cursor/supabase-foundation-b1fe` | `5491220` | ahead 1 | Postgres/Auth/Storage/cron; PR #5 |
| orphan history `f0f51ab` | (bez refa tip) | brak wspólnej bazy z main | wcześniejsza wersja content (force-push na `cdd6d73`) |

**Lokalnie w tym audycie:** tylko worktree pod `/tmp/audit/*` (detached, bez push). Brak lokalnych commitów feature poza tym raportem. Workspace Cloud Agenta startował na `f-nster-konfigurator-max` (DIN Next) — to **osobne** repo; kampanie audytowano z klonu `fonsterfaktor-campaigns`.

### 3. Który branch lub commit proponujesz jako punkt startowy do integracji i dlaczego?

**Punkt startowy: `origin/main` @ `468ba15`, potem merge `feat/campaign-analytics` @ `e43dc90`.**

Powody:

1. Publikacje są już w `main` i przechodzą acceptance + unit tests na tipie analytics.
2. Analytics jest **jedynym** branchem z pełnym, zweryfikowanym łańcuchem: seed → `/r/{id}` → symulator DIN Next → raport/weekly summary → `npm run build`.
3. Content (`feat/campaign-content` @ `3a2374b`) też bazuje na `main` i jest mergeable — kolejny krok po analytics (rozszerza `schema.ts` / typy).
4. Supabase foundation (`5491220`) to właściwy kierunek docelowy, ale **bez credentials blokuje** login, prywatne Storage i cron; lepiej dołożyć po scaleniu SQLite-demo albo świadomie przełączyć driver i przepisać store.
5. **Nie** startować z `cursor/links-analytics-module-b1fe` ani ze starego orphan `f0f51ab`.

### 4. Jakie trzy następne działania mają największy wpływ na gotowość do testów?

1. **Ustawić GitHub default branch na `main`** i scalić PR #3 (`feat/campaign-analytics`) + PR #4 / `feat/campaign-content`; zamknąć PR #2 jako superseding. Jedno drzewo = jeden `npm run seed:demo && npm run dev` z `/campaigns`, `/publications`, `/analytics`.
2. **Utworzyć osobny projekt Supabase** (lub świadomie zostać na `STORAGE_DRIVER=sqlite` do e2e): zastosować `supabase/migrations/20261116120000_init.sql`, uzupełnić `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dodać użytkownika Auth — wtedy odblokuje się `/login`, signed upload i job `publish-due`.
3. **Zdefiniować sekrety testowe Meta tylko lokalnie** (`META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_ALLOW_LIVE_SENDS=false` aż do świadomego testu) **albo** uznać day-1 wyłącznie `manual`/`test`; bez tego `connected` pozostaje zablokowane (potwierdzone lokalnie). Równolegle: ustawić `DIN_NEXT_INGEST_SECRET` + checklistę w DIN Next (`docs/configurator-integration.md` na analytics).

---

## Inwentaryzacja Git

### Remotes / HEAD

- `origin` → `https://github.com/Macmus40/fonsterfaktor-campaigns.git` (public)
- `origin/HEAD` → `cursor/publications-planning-c851` (**nie** `main`)
- `origin/main` tip: `468ba15`

### Worktree (stan audytu)

| Path | HEAD | Branch |
| --- | --- | --- |
| `/tmp/audit/fonsterfaktor-campaigns` | raport → `audit/project-status` | czysty poza `docs/PROJECT_STATUS.md` |
| `/tmp/audit/wt-main` | `468ba15` | detached, clean |
| `/tmp/audit/wt-analytics` | `e43dc90` | detached (+ lokalne `data/`, `node_modules`) |
| `/tmp/audit/wt-content` | `f0f51ab` | detached (stary orphan tip) |
| `/tmp/audit/wt-content2` | `3a2374b` | detached |
| `/tmp/audit/wt-links-old` | `55120bb` | detached |
| `/tmp/audit/wt-supabase` | `5491220` | detached |

Wszystkie worktree audytowe: **nie wypychane**; bez niezapisanych zmian w kodzie źródłowym (tylko runtime DB / deps).

### Otwarte / zamknięte PR

| PR | Stan | Head | Base | Mergeable |
| --- | --- | --- | --- | --- |
| [#1](https://github.com/Macmus40/fonsterfaktor-campaigns/pull/1) | MERGED | `cursor/publications-planning-c851` | `main` | — |
| [#2](https://github.com/Macmus40/fonsterfaktor-campaigns/pull/2) | OPEN | `cursor/links-analytics-module-b1fe` | `main` | **CONFLICTING** |
| [#3](https://github.com/Macmus40/fonsterfaktor-campaigns/pull/3) | OPEN | `feat/campaign-analytics` | `main` | MERGEABLE |
| [#4](https://github.com/Macmus40/fonsterfaktor-campaigns/pull/4) | OPEN | `cursor/campaign-content-flow-e291` | `main` | MERGEABLE |
| [#5](https://github.com/Macmus40/fonsterfaktor-campaigns/pull/5) | OPEN | `cursor/supabase-foundation-b1fe` | `main` | MERGEABLE |

### Porzucone / dublujące podejścia i konflikty

- **Dwie analityki:** PR #2 (skeleton) vs PR #3 (na main) — ten sam zakres; #2 konfliktuje.
- **Content rewrite:** tip brancha content był orphan `f0f51ab`, potem force-push na `cdd6d73` (rodzic = main). Stary commit zostaje w historii, ale nie jest tipem.
- **Default branch ≠ main** — klon „goły” dostaje stare publications tip zamiast `main`.
- **Schema drift** content vs analytics (kolumny `context_json`, `generation_source`, `platform_stats`, `publication_attempts` itd.) — przy równoległym merge wymagana ostrożna kolejność / rebase.
- **Supabase foundation** przepisuje kontrakt i warstwę store — koliduje koncepcyjnie z bezpośrednim SQLite w analytics/content; planować jako osobną warstwę po scaleniu feature albo z rebase feature na foundation.
- Agenci Cloud startowali często z repo DIN Next (`f-nster-konfigurator-max`), a pushowali do `fonsterfaktor-campaigns` — ryzyko pomyłki workspace.

---

## Tabela funkcji × status × branch

Legenda: **działa** | **działa w trybie testowym** | **jest w kodzie, ale wymaga weryfikacji** | **brakuje** | **blokada**

| Obszar | Status | Branch / SHA | Dowód / uwagi |
| --- | --- | --- | --- |
| Logowanie panelu | **brakuje** na main/analytics/content; **blokada** na supabase | `5491220` ma `/login` + middleware | Bez `NEXT_PUBLIC_SUPABASE_*` probe: „dostep_panelu_po_zalogowaniu” = false |
| Zapis kampanii po restarcie | **działa** (SQLite) | content `f0f51ab`/`3a2374b`, analytics `e43dc90` | Po restarcie `npm run dev` nadal 1 kampania / 3 warianty (content). Probe sqlite: OK |
| Mechanizm storage | SQLite lokalnie; Postgres w kodzie foundation | main+features vs `5491220` | Brak runtime Postgres bez projektu |
| Dodanie zdjęcia/filmu | **działa w trybie testowym** (URL / demo assets) | content | API materials + seed; multipart upload UI **brakuje** (limitations.md). Supabase signed upload **blokada** bez credentials |
| Odczyt mediów | **działa** (public) | analytics/main | `GET /demo/svart-skjutparti-fasad.jpg` → 200; `.mp4` → 200 |
| Kontrola dostępu do plików | **brakuje** (public `public/demo`); prywatne Storage **blokada** | supabase | Bucket `campaign-media` w migracji; nie przetestowano |
| Generowanie SE tekstów (szablony + tagi) | **działa** | content | `POST /api/campaigns/:id/generate` → warianty A/B (`price_custom`, `season_problem`), `generationSource=user_description` |
| Sezon / święta / pogoda | **działa** (pola kontekstu → szablony) | content | Seed `season=vinter`, `weather=kyla` → headline „Inför vinter när det är kyla…” |
| Analiza vision zdjęcia/filmu | **brakuje** (prawdziwa); flaga env | content | `LOCAL_MATERIAL_ANALYSIS=1` tylko zmienia etykietę provenance; brak CV |
| Edycja / zatwierdzanie tekstów | **działa** | content | `PATCH .../variants/:id` status `approved` potwierdzony HTTP |
| Kalendarz publikacji | **działa** | main / analytics | UI `/publications`, acceptance Stockholm; HTTP 200 |
| Eksport ręczny (`manual`) | **działa** | analytics | acceptance: package z headline, media, link |
| Symulacja publikacji (`test`) | **działa w trybie testowym** | analytics `e43dc90` | `POST .../send` force=success → `published`, `confirmationKind=test` |
| Rzeczywista wysyłka FB/IG (`connected`) | **blokada** | analytics/main | Brak `META_PAGE_ID` / `META_PAGE_ACCESS_TOKEN`; send → failure + `blockedReason` |
| Wykonanie zaplanowane przy zamkniętym panelu | **brakuje** na main/analytics; **jest w kodzie, wymaga weryfikacji** na supabase | `5491220` | `vercel.json` cron `*/5` → `/api/jobs/publish-due`; lokalnie `npm run jobs:publish-due`; **nie** uruchamiano live cron |
| Oznaczone linki `/r/{linkId}` | **działa** | analytics | 302 + `ff_link_id` / `ff_publication_id` / `ff_variant=A`; click w DB |
| Rozpoznanie wariantu | **działa** | analytics | redirect buduje `ff_variant` z approved label |
| Pomiar wejścia (transition) | **działa** | analytics | bot → `link_preview`; browser → `click` (nie „unikalny klient”) |
| price_view / inquiry | **działa w trybie testowym** (symulator) | analytics | `POST /api/simulate/din-next` → events; raport totals |
| Integracja z prawdziwym DIN Next | **jest w kodzie, wymaga weryfikacji** | analytics docs | Spec w `docs/configurator-integration.md`; brak live DIN Next w audycie |
| Raport / trendy / next test | **działa** (demo + obliczenia) | analytics | `/analytics` 200; weekly-summary JSON; acceptance A vs B |
| Dane ręczne vs pobierane | ręczne: `platform_stats` (`dataSource=manual`); auto: clicks, DIN events, seed | analytics | POST platform-stats OK; Meta insights pull wymaga `META_ACCESS_TOKEN` — nie zweryfikowano |
| Migracje / `.env.example` / start / build | **działa** (SQLite path); Supabase migracja w PR #5 | patrz niżej | `npm run build` OK na analytics i content tip |

---

## Wyniki prób (skrót)

### A. `feat/campaign-analytics` @ `e43dc90`

| Próba | Wynik |
| --- | --- |
| `npm run seed:demo` | OK — 2 publikacje + linki |
| `npm test` | 10/10 pass |
| `npm run acceptance:analytics` | OK — funnel A/B, weekly next-test |
| `npm run test:acceptance:publications` | OK — test/manual/ambiguous/reconcile; Meta status `blocked_missing_credentials` |
| `npm run build` | OK — Next 16.4.6 |
| `GET /` `/publications` `/analytics` | 200 |
| `GET /r/lnk_…` | 302 na konfigurator demo + parametry ff_* |
| `POST /api/simulate/din-next` | OK price_view ×2 + inquiry |
| `POST /api/publications` + `/send` test | published |
| `POST .../send` connected | failure — brak Meta env |
| `POST /api/analytics/platform-stats` | OK `dataSource=manual` |

### B. Content (orphan `f0f51ab` oraz tip `3a2374b`)

| Próba | Wynik |
| --- | --- |
| seed + `/campaigns` 200 | OK |
| generate + approve + restart | dane w SQLite zachowane |
| `npm run build` na `3a2374b` | OK (routes `/campaigns` + `/publications`) |
| `npm test` | brak skryptu test na starszym tipie orphan |

### C. Supabase foundation @ `5491220`

| Próba | Wynik |
| --- | --- |
| `npm run probe:foundation` | brak 3 zmiennych Supabase; 3/3 probe fail |
| `STORAGE_DRIVER=sqlite npm run probe:foundation` | zapis kampanii OK; plik + login nadal fail |

---

## Blokery

| Bloker | Wpływ | Wymagana usługa / krok |
| --- | --- | --- |
| Brak projektu Supabase + env | login, prywatne media, trwały Postgres, cron w trybie docelowym | Utworzyć projekt → SQL `supabase/migrations/20261116120000_init.sql` → `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → user Auth → `npm run probe:foundation` |
| Brak Meta Page token | `connected` publish | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`; opcjonalnie `META_IG_USER_ID`; `META_ALLOW_LIVE_SENDS=true` tylko na koncie testowym |
| Brak live DIN Next | pomiar konwersji produkcyjnej | wdrożyć POST eventów wg `docs/configurator-integration.md` + wspólny `DIN_NEXT_INGEST_SECRET` |
| Default branch GitHuba | mylący klon | Settings → default branch = `main` |
| PR #2 conflicting | szum integracyjny | zamknąć na rzecz #3 |
| Brak schedulera na tipach SQLite | zaplanowane posty nie wyjdą przy zamkniętym panelu | scalić/przenieść `publish-due` z foundation **lub** ręczny send |

### Zmienne z `.env.example` istotne dla prób

**Analytics (`e43dc90`):** Meta (`META_PAGE_*`, `META_IG_USER_ID`, `META_ALLOW_LIVE_SENDS`, …), `APP_ORIGIN`, `DIN_NEXT_INGEST_SECRET` / `FF_INGEST_SECRET`, opcjonalnie `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`.

**Content:** jak wyżej + opcjonalnie `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL`, `LOCAL_MATERIAL_ANALYSIS`.

**Supabase foundation:** dodatkowo `STORAGE_DRIVER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `ALLOW_UNAUTHENTICATED_CRON`, `PUBLISH_JOB_MODE`.

---

## Proponowana kolejność łączenia zmian

1. Ustawić default branch → `main` (`468ba15`).
2. Merge **PR #3** `feat/campaign-analytics` (`e43dc90`) → `main`.
3. Merge **content** (`feat/campaign-content` `3a2374b` lub PR #4 `cdd6d73`) → `main`; rozwiązać konflikty `schema.ts` / `types.ts` / `seed-demo` / `campaign-contract.md`.
4. Zamknąć **PR #2** (duplikat).
5. Rebase / dostosować **PR #5** foundation pod nowy `main` (store + Auth + Storage + `publish-due`); nie mergować na ślepo przed decyzją o `STORAGE_DRIVER`.
6. Smoke e2e na jednym checkout: seed → campaigns generate/approve → schedule test publish → `/r/` → simulate DIN → `/analytics`.
7. Dopiero potem credentials Supabase + (opcjonalnie) Meta test page.

---

## Gotowość wdrożeniowa (Vercel / Supabase)

| Element | Stan |
| --- | --- |
| Next.js build | OK lokalnie (analytics, content tip) |
| `vercel.json` cron | tylko na foundation |
| Migracje SQL Supabase | plik w PR #5; **nie** uruchamiane (zakaz audytu) |
| `.env.example` | obecne na wszystkich istotnych tipach |
| Instrukcja startu | README (SQLite) / `docs/local-setup.md` + `docs/deploy-vercel.md` (foundation) |
| DIN Next | osobna aplikacja — bez zmian w tym repo |

---

## Potwierdzenie push raportu

- Branch: `audit/project-status`
- Plik: [`docs/PROJECT_STATUS.md`](./PROJECT_STATUS.md)
- Link: https://github.com/Macmus40/fonsterfaktor-campaigns/blob/audit/project-status/docs/PROJECT_STATUS.md
- Pierwszy commit z raportem: `4c0949537b9bac30e50bc76ae3cf904d9b896512`
- Tip brancha: `git ls-remote origin refs/heads/audit/project-status`
