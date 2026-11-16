import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contentVariants, links, publications } from "@/lib/db/schema";
import { ingestConversionEvent } from "@/lib/events/ingest";
import { classifyUserAgent } from "@/lib/links/bots";
import { buildRedirectDestination } from "@/lib/links/destination";

export const runtime = "nodejs";

/**
 * Tagged publication link → konfigurator redirect (result source A).
 * Records a human `click` (transition) or `link_preview` for known bots.
 * Redirect counts are transitions — never presented as unique customers.
 */
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

  const userAgent = request.headers.get("user-agent");
  const bot = classifyUserAgent(userAgent);
  const eventType = bot.isBot ? "link_preview" : "click";

  let variantLabel: string | null = null;
  if (link.publicationId) {
    const pub = db
      .select()
      .from(publications)
      .where(eq(publications.id, link.publicationId))
      .get();
    if (pub?.contentVariantId) {
      const variant = db
        .select()
        .from(contentVariants)
        .where(eq(contentVariants.id, pub.contentVariantId))
        .get();
      variantLabel = variant?.label ?? null;
    }
  }

  ingestConversionEvent({
    source: "tagged_link",
    eventType,
    linkId: link.id,
    campaignId: link.campaignId,
    publicationId: link.publicationId,
    payload: {
      ...utm,
      userAgent,
      bot: bot.isBot,
      botKind: bot.kind,
      matchedPattern: bot.matchedPattern,
      metricSemantics: "transition_or_preview_not_unique_customers",
    },
  });

  const dest = buildRedirectDestination({
    destinationUrl: link.destinationUrl,
    linkId: link.id,
    publicationId: link.publicationId,
    contentVariantLabel: variantLabel,
    utm,
  });

  return NextResponse.redirect(dest, 302);
}
