import { NextRequest, NextResponse } from "next/server";
import {
  getPublication,
  listAttempts,
  registerManualPostUrl,
} from "@/lib/publications/service";
import { handoffToAnalytics } from "@/lib/publications/analytics-handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const publication = getPublication(id);
  if (!publication) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attempts = listAttempts(id);
  return NextResponse.json({ publication, attempts });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { postUrl?: string };
    if (!body.postUrl) {
      return NextResponse.json({ error: "postUrl required" }, { status: 400 });
    }
    const publication = registerManualPostUrl(id, body.postUrl);
    const handoff = handoffToAnalytics({
      publication,
      confirmationKind: "manual",
      postUrl: body.postUrl,
      platformPostId: body.postUrl,
    });
    return NextResponse.json({ publication, handoff });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
