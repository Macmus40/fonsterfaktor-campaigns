import { NextRequest, NextResponse } from "next/server";
import { sendPublication } from "@/lib/publications/send";
import type { PublishMode } from "@/lib/types";
import type { TestPublishForce } from "@/lib/publications/test-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: PublishMode;
      force?: TestPublishForce;
      idempotencyKey?: string;
    };
    const origin = req.nextUrl.origin;
    const result = await sendPublication(id, {
      mode: body.mode,
      force: body.force,
      idempotencyKey: body.idempotencyKey,
      origin,
    });
    return NextResponse.json(result, {
      status: result.attempt.outcome === "success" ? 200 : 409,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
