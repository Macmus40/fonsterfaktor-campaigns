import { NextResponse } from "next/server";
import { ingestDinNextEvent } from "@/lib/events/ingest";
import type { DinNextEventPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: DinNextEventPayload;
  try {
    body = (await request.json()) as DinNextEventPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body?.eventType) {
    return NextResponse.json(
      { ok: false, error: "eventType_required" },
      { status: 400 },
    );
  }

  const result = ingestDinNextEvent(body);
  return NextResponse.json({
    ok: true,
    eventId: result.eventId,
    deduped: result.deduped,
  });
}
