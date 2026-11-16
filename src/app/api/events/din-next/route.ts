import { NextResponse } from "next/server";
import { assertIngestAuthorized } from "@/lib/events/auth";
import { ingestDinNextEvent } from "@/lib/events/ingest";
import type { DinNextEventPayload } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Result source B — DIN Next / konfigurator conversion events.
 * Contact data must stay on the konfigurator; payloads are sanitized.
 * Replayed idempotencyKey → 200 + deduped:true (no double count).
 */
export async function POST(request: Request) {
  const auth = assertIngestAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

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

  try {
    const result = ingestDinNextEvent(body);
    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      deduped: result.deduped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest_failed";
    if (message.startsWith("unsupported_event_type")) {
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
