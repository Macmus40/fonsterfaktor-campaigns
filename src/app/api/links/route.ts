import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { links } from "@/lib/db/schema";
import { rowToLink } from "@/lib/links/mint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const publicationId = req.nextUrl.searchParams.get("publicationId");
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const db = getDb();

  let rows = db.select().from(links).all();
  if (publicationId) {
    rows = rows.filter((r) => r.publicationId === publicationId);
  } else if (campaignId) {
    rows = db
      .select()
      .from(links)
      .where(eq(links.campaignId, campaignId))
      .all();
  }

  return NextResponse.json({ links: rows.map(rowToLink) });
}
