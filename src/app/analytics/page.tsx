import { eq } from "drizzle-orm";
import { PlatformStatsForm } from "@/components/analytics/PlatformStatsForm";
import { ReportView } from "@/components/analytics/ReportView";
import { buildCampaignReport } from "@/lib/analytics/report";
import { buildWeeklySummary } from "@/lib/analytics/weekly-summary";
import { getDb } from "@/lib/db/client";
import { contentVariants, publications } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ campaignSlug?: string; from?: string; to?: string }>;
}) {
  return <AnalyticsInner searchParams={searchParams} />;
}

async function AnalyticsInner({
  searchParams,
}: {
  searchParams?: Promise<{ campaignSlug?: string; from?: string; to?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const report = buildCampaignReport({
    campaignSlug: sp.campaignSlug ?? "svart-skjutparti",
    from: sp.from ?? null,
    to: sp.to ?? null,
  });

  if (!report) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-white p-8 text-stone-600">
        Brak kampanii. Uruchom{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">
          npm run seed:demo
        </code>{" "}
        a następnie{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">
          npm run acceptance:analytics
        </code>
        .
      </div>
    );
  }

  const summary = buildWeeklySummary(report, {
    periodLabel: "Tydzień demo / okres raportu",
  });

  const db = getDb();
  const pubs = db
    .select()
    .from(publications)
    .where(eq(publications.campaignId, report.campaign.id))
    .all();
  const variants = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, report.campaign.id))
    .all();

  const pubOptions = pubs.map((p) => {
    const v = variants.find((x) => x.id === p.contentVariantId);
    return {
      id: p.id,
      label: `Wariant ${v?.label ?? "?"} · ${p.channel}`,
    };
  });

  return (
    <div className="space-y-8">
      <ReportView report={report} summary={summary} />
      <PlatformStatsForm
        campaignId={report.campaign.id}
        publications={pubOptions}
      />
    </div>
  );
}
