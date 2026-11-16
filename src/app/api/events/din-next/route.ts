import { NextResponse } from "next/server";
import { assertIngestAuthorized } from "@/lib/events/auth";
import { ingestDinNextEvent } from "@/lib/events/ingest";
import { recordDinNextInquiry } from "@/lib/events/din-next-inquiries";
import { stripContactFields } from "@/lib/events/sanitize";
import type { DinNextEventPayload } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Public to DIN Next, authenticated by shared secret (see campaign-contract).
 * Contact PII is stripped; inquiry rows store id + attribution + status only.
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

  body.payload = stripContactFields(body.payload);

  try {
    const result = ingestDinNextEvent(body);

    let inquiry: unknown = null;
    if (body.eventType === "inquiry_submitted") {
      const externalId =
        (typeof body.payload?.inquiryId === "string" && body.payload.inquiryId) ||
        body.idempotencyKey ||
        result.eventId;
      try {
        inquiry = await recordDinNextInquiry({
          externalInquiryId: String(externalId),
          campaignId: body.campaignId ?? null,
          linkId: body.linkId ?? null,
          publicationId: body.publicationId ?? null,
          occurredAt: body.occurredAt,
          idempotencyKey: body.idempotencyKey ?? null,
          payload: body.payload,
        });
      } catch (inqErr) {
        inquiry = {
          warning: inqErr instanceof Error ? inqErr.message : String(inqErr),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      deduped: result.deduped,
      inquiry,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
