import { NextResponse } from "next/server";
import { buildCampaignReport } from "@/lib/analytics/report";

export const runtime = "nodejs";

/** Rollup snapshot used by the analytics panel */
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

  return NextResponse.json({
    ok: true,
    conversionMeasurementStatus: report.conversionMeasurementStatus,
    conversionMeasurementLabel: report.conversionMeasurementLabel,
    totals: report.totals,
    byPublication: report.byPublication.map((p) => ({
      publicationId: p.publicationId,
      channel: p.channel,
      variant: p.contentVariantLabel,
      funnel: p.funnel,
    })),
  });
}
