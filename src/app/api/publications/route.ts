import { NextRequest, NextResponse } from "next/server";
import { listPublications, schedulePublication } from "@/lib/publications/service";
import type { PublishMode, PublicationChannel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId") ?? undefined;
  const items = listPublications(campaignId ?? undefined);
  return NextResponse.json({ publications: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      campaignId?: string;
      contentVariantId?: string;
      channel?: PublicationChannel;
      scheduledAtLocal?: string;
      scheduledAtUtc?: string;
      publishMode?: PublishMode;
      materialIds?: string[];
    };

    if (!body.campaignId || !body.contentVariantId || !body.channel) {
      return NextResponse.json(
        { error: "campaignId, contentVariantId and channel are required" },
        { status: 400 },
      );
    }

    const publication = schedulePublication({
      campaignId: body.campaignId,
      contentVariantId: body.contentVariantId,
      channel: body.channel,
      scheduledAtLocal: body.scheduledAtLocal,
      scheduledAtUtc: body.scheduledAtUtc,
      publishMode: body.publishMode ?? "manual",
      materialIds: body.materialIds,
    });

    return NextResponse.json({ publication }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
