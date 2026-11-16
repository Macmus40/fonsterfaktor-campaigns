# Acceptance — campaign content flow (Agent 2)

**Branch:** `feat/campaign-content`  
**Repo:** https://github.com/Macmus40/fonsterfaktor-campaigns.git  
**Base:** `main`  
**Demo campaign product:** Drutex skjutparti – svart  

## Verified path

1. Create / open campaign with product, goal, region, season, weather, features (optional price).
2. Add demo **image** (`/demo/svart-skjutparti-fasad.jpg`) and demo **video** (`/demo/svart-skjutparti-open.mp4`).
3. Describe material (+ scene notes for video).
4. Generate ≥2 Swedish variants per material (`price_custom`, `season_problem`) via local templates.
5. Change context (clear price) → regenerate omits price and lists missing fields.
6. Edit + copy fields; approve a variant; hand off to planning (`status=ready`, `planningReadyAt` set).
7. Re-open campaign after process restart — SQLite retains data.

## Screenshots (demo data)

| File | What it shows |
| --- | --- |
| `content-campaigns-list.webp` | `/campaigns` list + new campaign form |
| `content-variants-preview.webp` | Material preview beside draft variants + provenance |
| `content-planning-handoff.webp` | Approve / handoff to planning |

## Limitations

See `docs/content-flow-limitations.md` (no paid LLM, no CV analysis by default, video texts not burned in, URL/demo assets only).
