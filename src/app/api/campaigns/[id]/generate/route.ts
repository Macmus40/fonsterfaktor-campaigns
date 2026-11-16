import { NextResponse } from "next/server";
import {
  generateVariantsForMaterial,
  getCampaignBundle,
} from "@/lib/campaigns/repository";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    materialId?: string;
    preferLocalModel?: boolean;
    replaceDrafts?: boolean;
  };

  if (!body.materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }

  const result = await generateVariantsForMaterial(
    bundle.campaign.id,
    body.materialId,
    {
      preferLocalModel: body.preferLocalModel,
      replaceDrafts: body.replaceDrafts,
    },
  );

  if (!result) {
    return NextResponse.json({ error: "material_not_found" }, { status: 404 });
  }

  const refreshed = getCampaignBundle(bundle.campaign.id);
  return NextResponse.json({
    ...refreshed,
    generated: result.proposals,
    missingFields: result.missingFields,
    localModelConfigured: Boolean(process.env.LOCAL_LLM_URL),
  });
}
