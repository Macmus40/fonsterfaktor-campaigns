import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { links } from "@/lib/db/schema";
import { ingestConversionEvent } from "@/lib/events/ingest";

export const runtime = "nodejs";

/** Tagged app link redirect — source A attribution */
export async function GET(
  request: Request,
  context: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await context.params;
  const db = getDb();
  const link = db.select().from(links).where(eq(links.id, linkId)).get();

  if (!link) {
    return NextResponse.json({ ok: false, error: "link_not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const utm = {
    utm_source: url.searchParams.get("utm_source") ?? link.utmSource,
    utm_medium: url.searchParams.get("utm_medium") ?? link.utmMedium,
    utm_campaign: url.searchParams.get("utm_campaign") ?? link.utmCampaign,
    utm_content: url.searchParams.get("utm_content") ?? link.utmContent,
    utm_term: url.searchParams.get("utm_term") ?? link.utmTerm,
  };

  ingestConversionEvent({
    source: "tagged_link",
    eventType: "click",
    linkId: link.id,
    campaignId: link.campaignId,
    publicationId: link.publicationId,
    payload: { ...utm, userAgent: request.headers.get("user-agent") },
  });

  const dest = new URL(link.destinationUrl);
  for (const [k, v] of Object.entries(utm)) {
    if (v) dest.searchParams.set(k, v);
  }
  dest.searchParams.set("ff_link_id", link.id);

  return NextResponse.redirect(dest.toString(), 302);
}
