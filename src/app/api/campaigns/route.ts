import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns/store";
import { getStorageDriver, supabaseConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  contentVariants,
  links,
  materials,
  publications,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  if (getStorageDriver() === "sqlite" || !supabaseConfigured()) {
    return { user: { id: "local-dev" } as { id: string } };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

export async function GET() {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    if (getStorageDriver() === "sqlite" || !supabaseConfigured()) {
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
      return NextResponse.json({ ok: true, driver: "sqlite", campaigns: result });
    }

    const rows = await listCampaigns();
    return NextResponse.json({ ok: true, driver: "supabase", campaigns: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    const status = message.includes("Brak konfiguracji") || message.includes("supabase_not_configured")
      ? 503
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: {
    slug?: string;
    name?: string;
    product?: string;
    goal?: string;
    destinationUrl?: string;
    market?: string;
    region?: string | null;
    status?: string;
    isDemo?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.slug || !body.name || !body.product || !body.goal || !body.destinationUrl) {
    return NextResponse.json(
      { ok: false, error: "slug_name_product_goal_destinationUrl_required" },
      { status: 400 },
    );
  }

  try {
    const campaign = await createCampaign({
      slug: body.slug,
      name: body.name,
      product: body.product,
      goal: body.goal,
      destinationUrl: body.destinationUrl,
      market: body.market,
      region: body.region,
      status: body.status,
      isDemo: body.isDemo,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create_failed";
    const status = message.includes("Brak konfiguracji") || message.includes("supabase_not_configured")
      ? 503
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
