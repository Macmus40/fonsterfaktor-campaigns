import { notFound } from "next/navigation";
import { getCampaignBundle } from "@/lib/campaigns/repository";
import { CampaignWorkspace } from "@/components/campaigns/CampaignWorkspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const bundle = getCampaignBundle(id);
  if (!bundle) notFound();

  return <CampaignWorkspace initial={bundle} />;
}
