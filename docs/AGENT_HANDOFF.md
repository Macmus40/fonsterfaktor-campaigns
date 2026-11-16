# Agent handoff — FönsterFaktor Campaigns

## Repository
- **Remote:** https://github.com/Macmus40/fonsterfaktor-campaigns.git
- **Visibility:** public (do not change)
- **Base branch for agents 2–4:** `main`

## Contract commit (Agent 1 → agents 2–4)

Skeleton + `docs/campaign-contract.md` are on **`main`** (public repo). Use this shared starting point:

| Item | Value |
| --- | --- |
| Repo | `https://github.com/Macmus40/fonsterfaktor-campaigns.git` |
| Base branch | `main` |
| Current `main` SHA | `7a028c552c0d0ea1cf69c0f6bb8f5e7b9749bcf5` |
| Contract first landed | `f5a3088bea6c1d14ba010983da3396756f834f29` |
| Contract path | `docs/campaign-contract.md` |

Agents 2–4 must create **separate worktrees** from that contract commit and push only to their own branches:

| Agent | Branch |
| --- | --- |
| 2 — content | `feat/campaign-content` |
| 3 — publishing | `feat/campaign-publishing` |
| 4 — analytics | `feat/campaign-analytics` |

```bash
git fetch origin
git worktree add ../ff-publishing origin/main
cd ../ff-publishing
git checkout -b feat/campaign-publishing
```

## Ownership
See `docs/agent-ownership.md`. Leading agent merges verified branches after end-to-end review.
