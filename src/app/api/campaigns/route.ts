import { NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  getCampaignBundle,
} from "@/lib/campaigns/repository";
import type { CampaignContext } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const rows = listCampaigns();
  const campaigns = rows.map((c) => getCampaignBundle(c.id)!);
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    product?: string;
    goal?: string;
    destinationUrl?: string;
    market?: string;
    region?: string | null;
    context?: CampaignContext;
    isDemo?: boolean;
    slug?: string;
  };

  if (!body.name?.trim() || !body.product?.trim() || !body.goal?.trim()) {
    return NextResponse.json(
      { error: "name, product and goal are required" },
      { status: 400 },
    );
  }

  const destinationUrl =
    body.destinationUrl?.trim() ||
    "https://example.test/konfigurator?campaign=new";

  const bundle = createCampaign({
    name: body.name,
    product: body.product,
    goal: body.goal,
    destinationUrl,
    market: body.market,
    region: body.region,
    context: body.context,
    isDemo: body.isDemo,
    slug: body.slug,
  });

  return NextResponse.json(bundle, { status: 201 });
}
