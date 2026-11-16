import { NextResponse } from "next/server";
import { buildCampaignReport } from "@/lib/analytics/report";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const report = buildCampaignReport({
    campaignId: url.searchParams.get("campaignId"),
    campaignSlug: url.searchParams.get("campaignSlug") ?? "svart-skjutparti",
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!report) {
    return NextResponse.json(
      { ok: false, error: "campaign_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, report });
}
