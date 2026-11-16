import { getMetaServerConfig } from "./config";

export type InstagramPublishInput = {
  caption: string;
  imageUrl: string;
};

export type InstagramPublishResult =
  | {
      ok: true;
      mediaId: string;
      postUrl: string | null;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      ambiguous: boolean;
      errorMessage: string;
      raw: Record<string, unknown>;
    };

/**
 * Official Instagram Content Publishing API (two-step).
 * Day-1: prepared but not acceptance-tested without a professional IG
 * account linked to the designated test Page.
 * Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
export async function publishInstagramImage(
  input: InstagramPublishInput,
): Promise<InstagramPublishResult> {
  const cfg = getMetaServerConfig();
  if (!cfg.igUserId || !cfg.pageAccessToken) {
    return {
      ok: false,
      ambiguous: false,
      errorMessage:
        "Instagram blocked: META_IG_USER_ID / META_PAGE_ACCESS_TOKEN missing. Professional IG linked to Page required.",
      raw: { blocked: true, scope: "instagram_not_day1_testable" },
    };
  }
  if (!cfg.allowLiveSends) {
    return {
      ok: false,
      ambiguous: false,
      errorMessage:
        "Live Instagram sends disabled until META_ALLOW_LIVE_SENDS=true on the designated test account.",
      raw: { blocked: true },
    };
  }

  // Step 1 — create container
  const createUrl = new URL(
    `https://graph.facebook.com/${cfg.graphVersion}/${cfg.igUserId}/media`,
  );
  createUrl.searchParams.set("image_url", input.imageUrl);
  createUrl.searchParams.set("caption", input.caption);
  createUrl.searchParams.set("access_token", cfg.pageAccessToken);

  let createRes: Response;
  try {
    createRes = await fetch(createUrl, { method: "POST" });
  } catch (err) {
    return {
      ok: false,
      ambiguous: true,
      errorMessage: `IG container create network error: ${
        err instanceof Error ? err.message : String(err)
      }`,
      raw: { step: "create_container" },
    };
  }

  const createRaw = (await createRes.json()) as Record<string, unknown>;
  if (!createRes.ok || !createRaw.id) {
    return {
      ok: false,
      ambiguous: createRes.status >= 500,
      errorMessage: "Instagram media container creation failed",
      raw: createRaw,
    };
  }

  const creationId = String(createRaw.id);

  // Step 2 — publish container
  const publishUrl = new URL(
    `https://graph.facebook.com/${cfg.graphVersion}/${cfg.igUserId}/media_publish`,
  );
  publishUrl.searchParams.set("creation_id", creationId);
  publishUrl.searchParams.set("access_token", cfg.pageAccessToken);

  let publishRes: Response;
  try {
    publishRes = await fetch(publishUrl, { method: "POST" });
  } catch (err) {
    return {
      ok: false,
      ambiguous: true,
      errorMessage: `IG publish network error after container ${creationId} — reconcile before retry`,
      raw: {
        step: "media_publish",
        creationId,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const publishRaw = (await publishRes.json()) as Record<string, unknown>;
  if (!publishRes.ok || !publishRaw.id) {
    return {
      ok: false,
      ambiguous: publishRes.status >= 500,
      errorMessage: "Instagram media_publish failed",
      raw: { creationId, ...publishRaw },
    };
  }

  const mediaId = String(publishRaw.id);
  return {
    ok: true,
    mediaId,
    postUrl: null,
    raw: { creationId, publish: publishRaw },
  };
}
