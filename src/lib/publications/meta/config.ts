import type { MetaChannelCapability } from "@/lib/types";

/**
 * Server-side Meta credentials. Never expose these to the client.
 * Bind via Cursor app secrets / env — never commit values.
 */
export type MetaServerConfig = {
  graphVersion: string;
  pageId: string | null;
  pageAccessToken: string | null;
  igUserId: string | null;
  /** Human label of the only account allowed for live sends. */
  testAccountLabel: string | null;
  allowLiveSends: boolean;
};

export function getMetaServerConfig(): MetaServerConfig {
  const pageId = process.env.META_PAGE_ID?.trim() || null;
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim() || null;
  const igUserId = process.env.META_IG_USER_ID?.trim() || null;
  const testAccountLabel =
    process.env.META_TEST_ACCOUNT_LABEL?.trim() || null;
  const allowLiveSends =
    process.env.META_ALLOW_LIVE_SENDS === "true" &&
    Boolean(pageId && pageAccessToken && testAccountLabel);

  return {
    graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v22.0",
    pageId,
    pageAccessToken,
    igUserId,
    testAccountLabel,
    allowLiveSends,
  };
}

export function metaChannelCapabilities(): MetaChannelCapability[] {
  const cfg = getMetaServerConfig();
  const facebookReady = Boolean(cfg.pageId && cfg.pageAccessToken);

  return [
    {
      channel: "facebook_page",
      status: facebookReady
        ? cfg.allowLiveSends
          ? "ready"
          : "configured_untested"
        : "blocked_missing_credentials",
      day1Priority: true,
      requirements: [
        "Facebook Page access token (server-only)",
        "Permission pages_manage_posts",
        "Permission pages_read_engagement",
        "Permission pages_show_list",
        "User task CREATE_CONTENT on the Page",
        "POST /{page-id}/feed with message and/or link",
        "Live sends only when META_ALLOW_LIVE_SENDS=true and META_TEST_ACCOUNT_LABEL is set",
      ],
      notes: facebookReady
        ? `Page id configured. Live sends ${cfg.allowLiveSends ? "enabled" : "disabled"} for test account label "${cfg.testAccountLabel ?? "unset"}".`
        : "No META_PAGE_ID / META_PAGE_ACCESS_TOKEN on server. Connected mode returns a clear blocked error; use test or manual mode.",
    },
    {
      channel: "instagram",
      status: cfg.igUserId
        ? "blocked_account_scope"
        : "blocked_missing_credentials",
      day1Priority: false,
      requirements: [
        "Instagram professional account linked to a Facebook Page",
        "Permissions instagram_basic + instagram_content_publish (+ pages_read_engagement for FB Login path)",
        "Two-step publish: POST /{ig-user-id}/media then POST /{ig-user-id}/media_publish",
        "Publicly reachable image_url / video_url (Meta CURL fetch)",
        "Page Publishing Authorization if the linked Page requires PPA",
        "Rate limit: 100 API publishes / 24h rolling",
      ],
      notes:
        "Day-1 scope: integration code prepared, but live Instagram publishes are out of testable scope until a professional IG account linked to the designated test Page is available and verified. Do not treat Instagram as day-1 acceptance.",
    },
  ];
}
