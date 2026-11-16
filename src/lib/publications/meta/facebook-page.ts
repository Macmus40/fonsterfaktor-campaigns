import { getMetaServerConfig } from "./config";

export type FacebookPagePublishInput = {
  message: string;
  link?: string | null;
  /** Optional photo URL — uses /photos when set. */
  imageUrl?: string | null;
};

export type FacebookPagePublishResult =
  | {
      ok: true;
      postId: string;
      postUrl: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      ambiguous: boolean;
      errorMessage: string;
      raw: Record<string, unknown>;
    };

/**
 * Official Graph API publish to a Facebook Page feed.
 * Tokens stay server-side via getMetaServerConfig().
 * Docs: https://developers.facebook.com/docs/graph-api/reference/page/feed/
 */
export async function publishFacebookPagePost(
  input: FacebookPagePublishInput,
): Promise<FacebookPagePublishResult> {
  const cfg = getMetaServerConfig();
  if (!cfg.pageId || !cfg.pageAccessToken) {
    return {
      ok: false,
      ambiguous: false,
      errorMessage:
        "META_PAGE_ID / META_PAGE_ACCESS_TOKEN missing on server — cannot call Meta.",
      raw: { blocked: true },
    };
  }
  if (!cfg.allowLiveSends) {
    return {
      ok: false,
      ambiguous: false,
      errorMessage:
        "Live Meta sends disabled. Set META_ALLOW_LIVE_SENDS=true and META_TEST_ACCOUNT_LABEL to the designated test account only.",
      raw: { blocked: true, testAccountLabel: cfg.testAccountLabel },
    };
  }

  const endpoint = input.imageUrl
    ? `https://graph.facebook.com/${cfg.graphVersion}/${cfg.pageId}/photos`
    : `https://graph.facebook.com/${cfg.graphVersion}/${cfg.pageId}/feed`;

  const body = new URLSearchParams();
  body.set("access_token", cfg.pageAccessToken);
  if (input.imageUrl) {
    body.set("url", input.imageUrl);
    body.set("caption", input.message);
  } else {
    body.set("message", input.message);
    if (input.link) body.set("link", input.link);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    return {
      ok: false,
      ambiguous: true,
      errorMessage: `Network error talking to Meta (state unknown — reconcile before retry): ${
        err instanceof Error ? err.message : String(err)
      }`,
      raw: { networkError: true },
    };
  }

  let raw: Record<string, unknown> = {};
  try {
    raw = (await response.json()) as Record<string, unknown>;
  } catch {
    raw = { parseError: true, status: response.status };
  }

  if (!response.ok) {
    const msg =
      typeof raw.error === "object" &&
      raw.error &&
      "message" in (raw.error as object)
        ? String((raw.error as { message?: string }).message)
        : `Meta HTTP ${response.status}`;
    // 5xx / timeouts → ambiguous; 4xx client errors → definite failure
    const ambiguous = response.status >= 500 || response.status === 408;
    return { ok: false, ambiguous, errorMessage: msg, raw };
  }

  const postId = String(raw.id ?? raw.post_id ?? "");
  if (!postId) {
    return {
      ok: false,
      ambiguous: true,
      errorMessage:
        "Meta returned 2xx without post id — treat as ambiguous and reconcile.",
      raw,
    };
  }

  const postUrl = `https://www.facebook.com/${postId}`;
  return { ok: true, postId, postUrl, raw };
}

/** Look up whether a post id exists (used after ambiguous sends). */
export async function lookupFacebookPagePost(
  postId: string,
): Promise<{ found: boolean; raw: Record<string, unknown> }> {
  const cfg = getMetaServerConfig();
  if (!cfg.pageAccessToken) {
    return { found: false, raw: { blocked: true } };
  }
  const url = new URL(
    `https://graph.facebook.com/${cfg.graphVersion}/${postId}`,
  );
  url.searchParams.set("fields", "id,permalink_url,created_time");
  url.searchParams.set("access_token", cfg.pageAccessToken);

  try {
    const response = await fetch(url);
    const raw = (await response.json()) as Record<string, unknown>;
    if (!response.ok) return { found: false, raw };
    return { found: Boolean(raw.id), raw };
  } catch (err) {
    return {
      found: false,
      raw: {
        networkError: true,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
