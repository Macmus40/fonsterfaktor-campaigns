import { NextResponse } from "next/server";
import { buildCampaignReport } from "@/lib/analytics/report";
import { buildWeeklySummary } from "@/lib/analytics/weekly-summary";

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

  const summary = buildWeeklySummary(report, {
    periodLabel: url.searchParams.get("periodLabel") ?? undefined,
  });

  return NextResponse.json({ ok: true, summary, reportMeta: {
    campaignId: report.campaign.id,
    conversionMeasurementStatus: report.conversionMeasurementStatus,
    conversionMeasurementLabel: report.conversionMeasurementLabel,
  }});
}
