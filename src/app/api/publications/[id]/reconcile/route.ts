import { NextRequest, NextResponse } from "next/server";
import { reconcilePublication } from "@/lib/publications/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      treatAsMissing?: boolean;
    };
    const result = await reconcilePublication(id, {
      treatAsMissing: body.treatAsMissing,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
