import { NextResponse } from "next/server";
import {
  approveVariant,
  getCampaignBundle,
  updateVariant,
} from "@/lib/campaigns/repository";
import type {
  ContentAngle,
  ContentVariantStatus,
  ExtendedContent,
} from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id, variantId } = await ctx.params;
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    approve?: boolean;
    headline?: string;
    body?: string;
    cta?: string | null;
    channelHint?: string | null;
    label?: string;
    angle?: ContentAngle;
    status?: ContentVariantStatus;
    extended?: ExtendedContent;
    missingFields?: string[];
  };

  const owned = bundle.contentVariants.some((v) => v.id === variantId);
  if (!owned) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { approve, ...patch } = body;
  let variant = updateVariant(variantId, patch);
  if (!variant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (approve) {
    variant = approveVariant(variantId);
  }

  if (!variant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    variant,
    bundle: getCampaignBundle(id),
  });
}
