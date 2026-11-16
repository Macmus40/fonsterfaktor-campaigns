import { NextRequest, NextResponse } from "next/server";
import { listAnalyticsHandoffs } from "@/lib/publications/analytics-handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Seam for agent 4 — registered post ids / URLs from publishing. */
export async function GET(req: NextRequest) {
  const publicationId =
    req.nextUrl.searchParams.get("publicationId") ?? undefined;
  const items = listAnalyticsHandoffs(publicationId);
  return NextResponse.json({
    handoffs: items.map((h) => ({
      id: h.id,
      publicationId: h.publicationId,
      campaignId: h.campaignId,
      channel: h.channel,
      postUrl: h.postUrl,
      platformPostId: h.platformPostId,
      campaignLinkId: h.campaignLinkId,
      confirmationKind: h.confirmationKind,
      handedOffAt: h.handedOffAt,
      payload: JSON.parse(h.payloadJson || "{}"),
    })),
  });
}
