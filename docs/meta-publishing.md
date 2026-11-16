# Meta publishing (Facebook Page + Instagram)

Server-only integration. Secrets: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_USER_ID`, `META_TEST_ACCOUNT_LABEL`, `META_ALLOW_LIVE_SENDS`, optional `META_GRAPH_VERSION` (default `v22.0`).

## Facebook Page — day-1 priority

Official docs: [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/).

| Item | Requirement |
| --- | --- |
| Endpoint | `POST /{page-id}/feed` (text/link) or `POST /{page-id}/photos` |
| Token | Page access token (never shipped to the browser) |
| Permissions | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` |
| Task | User must have `CREATE_CONTENT` on the Page |
| Body | `message` and/or `link` (campaign tagged `/r/{linkId}` URL) |

**Channel status API:** `GET /api/meta/status` → `facebook_page`.

| Status | Meaning |
| --- | --- |
| `ready` | Credentials present and `META_ALLOW_LIVE_SENDS=true` |
| `configured_untested` | Credentials present; live sends still gated |
| `blocked_missing_credentials` | No page id/token on server |

Live Graph calls must target only the account named in `META_TEST_ACCOUNT_LABEL`.

## Instagram — prepared, not day-1 acceptance

Official docs: [Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/).

| Item | Requirement |
| --- | --- |
| Account | Instagram **professional** account linked to a Facebook Page |
| Flow | `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish` |
| Permissions | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (FB Login path) |
| Media | Public `image_url` / `video_url` (Meta fetches via cURL) |
| Limits | 100 API publishes / 24h; containers expire in 24h; PPA may block |

**Testable scope on the available account:** until a professional IG user id linked to the designated test Page is provisioned and verified, Instagram remains `blocked_missing_credentials` or `blocked_account_scope`. Code path exists under `src/lib/publications/meta/instagram.ts` but is **out of day-1 acceptance**.

## Ambiguous results

Network failures and 5xx responses are stored as `ambiguous`. Call `POST /api/publications/{id}/reconcile` before any retry so a duplicate post is not created.
