import { NextResponse } from "next/server";
import {
  getMetaServerConfig,
  metaChannelCapabilities,
} from "@/lib/publications/meta/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public capability status — never returns secrets. */
export async function GET() {
  const cfg = getMetaServerConfig();
  return NextResponse.json({
    timezone: "Europe/Stockholm",
    graphVersion: cfg.graphVersion,
    testAccountLabel: cfg.testAccountLabel,
    allowLiveSends: cfg.allowLiveSends,
    hasPageId: Boolean(cfg.pageId),
    hasPageToken: Boolean(cfg.pageAccessToken),
    hasIgUserId: Boolean(cfg.igUserId),
    channels: metaChannelCapabilities(),
  });
}
