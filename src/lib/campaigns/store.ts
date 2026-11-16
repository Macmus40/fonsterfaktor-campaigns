import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireSupabaseOrThrow } from "@/lib/db/repository";
import { getStorageDriver } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { newId, nowIso } from "@/lib/id";

export type CampaignInput = {
  slug: string;
  name: string;
  product: string;
  goal: string;
  destinationUrl: string;
  market?: string;
  region?: string | null;
  status?: string;
  isDemo?: boolean;
};

export async function createCampaign(input: CampaignInput) {
  if (getStorageDriver() === "sqlite") {
    const id = newId("cmp");
    const ts = nowIso();
    getDb()
      .insert(campaigns)
      .values({
        id,
        slug: input.slug,
        name: input.name,
        product: input.product,
        goal: input.goal,
        destinationUrl: input.destinationUrl,
        market: input.market ?? "SE",
        region: input.region ?? null,
        status: input.status ?? "draft",
        startsAt: null,
        endsAt: null,
        isDemo: Boolean(input.isDemo),
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
    return getDb().select().from(campaigns).where(eq(campaigns.id, id)).get()!;
  }

  requireSupabaseOrThrow();
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("campaigns")
    .insert({
      slug: input.slug,
      name: input.name,
      product: input.product,
      goal: input.goal,
      destination_url: input.destinationUrl,
      market: input.market ?? "SE",
      region: input.region ?? null,
      status: input.status ?? "draft",
      is_demo: Boolean(input.isDemo),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCampaignBySlug(slug: string) {
  if (getStorageDriver() === "sqlite") {
    return getDb().select().from(campaigns).where(eq(campaigns.slug, slug)).get() ?? null;
  }
  requireSupabaseOrThrow();
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCampaigns() {
  if (getStorageDriver() === "sqlite") {
    return getDb().select().from(campaigns).all();
  }
  requireSupabaseOrThrow();
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
