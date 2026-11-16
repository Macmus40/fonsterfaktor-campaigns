# Content flow limitations (v1)

- **No paid LLM APIs** — copy comes from local Swedish templates/tags. Optional `LOCAL_LLM_URL` (Ollama-compatible) may polish drafts; if unreachable, templates are kept.
- **No real computer-vision analysis** — `material_analysis` provenance only appears when `LOCAL_MATERIAL_ANALYSIS=1` (or after a local model pass). Default provenance is `user_description` or `template`.
- **Video texts are not burned into the file** — overlays/narration are editable + copyable fields only.
- **Uploads** — v1 accepts demo assets or a URL string; no multipart file upload UI yet.
- **Planning handoff** — sets campaign `status=ready` + `planningReadyAt`. Publications/links remain Agent 3.
- **Persistence** — SQLite at `data/campaigns.sqlite` (survives process restart; not committed to git).
- **Seed** — `npm run seed:demo` creates Svart skjutparti once; regenerating variants replaces *draft* rows for that material only.
