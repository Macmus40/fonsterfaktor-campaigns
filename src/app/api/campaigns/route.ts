import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  contentVariants,
  links,
  materials,
  publications,
} from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const rows = db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .all();

  const result = rows.map((c) => ({
    ...c,
    materials: db
      .select()
      .from(materials)
      .where(eq(materials.campaignId, c.id))
      .all(),
    contentVariants: db
      .select()
      .from(contentVariants)
      .where(eq(contentVariants.campaignId, c.id))
      .all(),
    publications: db
      .select()
      .from(publications)
      .where(eq(publications.campaignId, c.id))
      .all()
      .map((p) => ({
        ...p,
        materialIds: JSON.parse(p.materialIdsJson || "[]") as string[],
      })),
    links: db.select().from(links).where(eq(links.campaignId, c.id)).all(),
  }));

  return NextResponse.json({ campaigns: result });
}
