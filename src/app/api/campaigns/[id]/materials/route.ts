import { NextResponse } from "next/server";
import {
  addMaterial,
  getCampaignBundle,
  updateMaterial,
} from "@/lib/campaigns/repository";
import type { MaterialKind } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    kind?: MaterialKind;
    title?: string;
    url?: string;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
    durationSec?: number | null;
    userDescription?: string | null;
    sceneNotes?: string | null;
    useDemo?: boolean;
  };

  let kind = body.kind;
  let title = body.title;
  let url = body.url;

  if (body.useDemo) {
    kind = kind === "video" ? "video" : "image";
    if (kind === "video") {
      title = title || "Demo – öppning skjutparti";
      url = url || "/demo/svart-skjutparti-open.mp4";
    } else {
      title = title || "Demo – fasad skjutparti";
      url = url || "/demo/svart-skjutparti-fasad.jpg";
    }
  }

  if (!kind || !title?.trim() || !url?.trim()) {
    return NextResponse.json(
      { error: "kind, title and url are required (or useDemo)" },
      { status: 400 },
    );
  }

  const material = addMaterial(bundle.campaign.id, {
    kind,
    title,
    url,
    mimeType:
      body.mimeType ??
      (kind === "video" ? "video/mp4" : "image/jpeg"),
    width: body.width,
    height: body.height,
    durationSec: body.durationSec ?? (kind === "video" ? 4 : null),
    userDescription: body.userDescription,
    sceneNotes: body.sceneNotes,
  });

  return NextResponse.json({ material }, { status: 201 });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    materialId?: string;
    title?: string;
    url?: string;
    userDescription?: string | null;
    sceneNotes?: string | null;
  };

  if (!body.materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }

  const material = updateMaterial(body.materialId, body);
  if (!material || material.campaignId !== bundle.campaign.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ material });
}
