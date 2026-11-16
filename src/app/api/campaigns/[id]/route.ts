import { NextResponse } from "next/server";
import {
  getCampaignBundle,
  handoffToPlanning,
  updateCampaign,
} from "@/lib/campaigns/repository";
import type { CampaignContext, CampaignStatus } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    product?: string;
    goal?: string;
    destinationUrl?: string;
    market?: string;
    region?: string | null;
    status?: CampaignStatus;
    context?: CampaignContext;
    handoffToPlanning?: boolean;
  };

  if (body.handoffToPlanning) {
    const result = handoffToPlanning(id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result.bundle);
  }

  const updated = updateCampaign(id, body);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
