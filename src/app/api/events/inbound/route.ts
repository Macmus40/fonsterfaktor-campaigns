import { NextResponse } from "next/server";
import { ingestConversionEvent } from "@/lib/events/ingest";

export const runtime = "nodejs";

/** Source A: tagged-link / UTM inbound events */
export async function POST(request: Request) {
  let body: {
    eventType?: string;
    linkId?: string;
    campaignId?: string;
    campaignSlug?: string;
    publicationId?: string;
    occurredAt?: string;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.eventType) {
    return NextResponse.json(
      { ok: false, error: "eventType_required" },
      { status: 400 },
    );
  }

  const result = ingestConversionEvent({
    source: "tagged_link",
    eventType: body.eventType,
    linkId: body.linkId,
    campaignId: body.campaignId,
    campaignSlug: body.campaignSlug,
    publicationId: body.publicationId,
    occurredAt: body.occurredAt,
    idempotencyKey: body.idempotencyKey,
    payload: body.payload,
  });

  return NextResponse.json({
    ok: true,
    eventId: result.eventId,
    deduped: result.deduped,
  });
}
