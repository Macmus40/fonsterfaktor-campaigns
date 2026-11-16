import { NextRequest, NextResponse } from "next/server";
import { buildManualPackage } from "@/lib/publications/manual-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const pkg = buildManualPackage(id, req.nextUrl.origin);
    return NextResponse.json({ package: pkg });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
