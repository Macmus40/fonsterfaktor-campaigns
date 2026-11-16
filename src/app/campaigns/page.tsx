import Link from "next/link";
import { listCampaigns, getCampaignBundle } from "@/lib/campaigns/repository";
import { CampaignStatusBadge } from "@/components/campaigns/StatusBadge";
import { NewCampaignForm } from "@/components/campaigns/NewCampaignForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function CampaignsPage() {
  const rows = listCampaigns();
  const bundles = rows.map((c) => getCampaignBundle(c.id)!);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Kampanjer</h2>
        <p className="max-w-2xl text-stone-600">
          Skapa produktkampanj, lägg till foto/film, generera svenska
          textvarianter lokalt, godkänn och lämna till planering.
        </p>
      </section>

      <NewCampaignForm />

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Befintliga kampanjer
        </h3>
        {bundles.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white p-6 text-stone-600">
            Inga kampanjer ännu. Skapa en ovan eller kör{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">
              npm run seed:demo
            </code>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {bundles.map(({ campaign, materials, contentVariants }) => {
              const drafts = contentVariants.filter(
                (v) => v.status === "draft",
              ).length;
              const approved = contentVariants.filter(
                (v) => v.status === "approved",
              ).length;
              return (
                <li
                  key={campaign.id}
                  className="rounded-md border border-stone-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-lg font-medium text-cyan-900 underline-offset-2 hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-1 text-sm text-stone-500">
                        {campaign.product} · {campaign.market}
                        {campaign.region ? ` / ${campaign.region}` : ""}
                        {campaign.isDemo ? " · demo" : ""}
                      </p>
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                  <p className="mt-3 text-sm text-stone-600">
                    {materials.length} material · {drafts} utkast · {approved}{" "}
                    godkända
                    {campaign.planningReadyAt
                      ? " · överlämnad till planering"
                      : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
