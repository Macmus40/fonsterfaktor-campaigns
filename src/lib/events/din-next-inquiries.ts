import { stripContactFields } from "@/lib/events/sanitize";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStorageDriver } from "@/lib/config";

/**
 * Persist inquiry id + attribution + status only (no contact PII).
 * SQLite prototype stores the same fields inside conversion_events payload.
 */
export async function recordDinNextInquiry(opts: {
  externalInquiryId: string;
  campaignId?: string | null;
  linkId?: string | null;
  publicationId?: string | null;
  occurredAt?: string;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
}) {
  const safe = stripContactFields(opts.payload);
  if (getStorageDriver() === "sqlite") {
    return {
      stored: "conversion_event_payload" as const,
      externalInquiryId: opts.externalInquiryId,
      payload: safe,
    };
  }

  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("din_next_inquiries")
    .upsert(
      {
        external_inquiry_id: opts.externalInquiryId,
        campaign_id: opts.campaignId ?? null,
        link_id: opts.linkId ?? null,
        publication_id: opts.publicationId ?? null,
        status: "received",
        occurred_at: opts.occurredAt ?? new Date().toISOString(),
        payload: safe,
        idempotency_key: opts.idempotencyKey ?? null,
      },
      { onConflict: "external_inquiry_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return { stored: "din_next_inquiries" as const, row: data };
}
