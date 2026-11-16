import type { ContentVariantStatus, CampaignStatus } from "@/lib/types";

const campaignStyles: Record<CampaignStatus, string> = {
  draft: "bg-amber-100 text-amber-900 ring-amber-300",
  ready: "bg-blue-100 text-blue-900 ring-blue-300",
  active: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  paused: "bg-stone-200 text-stone-700 ring-stone-300",
  archived: "bg-stone-100 text-stone-500 ring-stone-200",
};

const variantStyles: Record<ContentVariantStatus, string> = {
  draft:
    "bg-amber-50 text-amber-900 ring-2 ring-amber-400/80 border-l-4 border-amber-500",
  approved:
    "bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/80 border-l-4 border-emerald-600",
  retired: "bg-stone-100 text-stone-500 ring-1 ring-stone-300",
};

export function CampaignStatusBadge({ status }: { status: string }) {
  const key = status as CampaignStatus;
  const cls = campaignStyles[key] ?? campaignStyles.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      {status}
    </span>
  );
}

export function VariantStatusBadge({ status }: { status: string }) {
  const key = status as ContentVariantStatus;
  const cls = variantStyles[key] ?? variantStyles.draft;
  const label =
    status === "approved"
      ? "Godkänd"
      : status === "draft"
        ? "Utkast"
        : status;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
