import { NextResponse } from "next/server";
import { listLinksForCampaign, mintPublicationLink } from "@/lib/links/mint";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "campaignId_required" },
      { status: 400 },
    );
  }
  const rows = listLinksForCampaign(campaignId);
  return NextResponse.json({
    ok: true,
    links: rows.map((l) => ({
      ...l,
      taggedPath: `/r/${l.id}`,
    })),
  });
}

export async function POST(request: Request) {
  let body: {
    campaignId?: string;
    publicationId?: string;
    label?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    destinationUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.campaignId || !body.publicationId) {
    return NextResponse.json(
      { ok: false, error: "campaignId_and_publicationId_required" },
      { status: 400 },
    );
  }

  try {
    const result = mintPublicationLink({
      campaignId: body.campaignId,
      publicationId: body.publicationId,
      label: body.label,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
      destinationUrl: body.destinationUrl,
    });
    return NextResponse.json({
      ok: true,
      created: result.created,
      link: { ...result.link, taggedPath: `/r/${result.link.id}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mint_failed";
    const status = message.endsWith("_not_found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
