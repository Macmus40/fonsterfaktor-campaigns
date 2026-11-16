import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  contentVariants,
  materials,
} from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import type {
  CampaignContext,
  CampaignStatus,
  ContentAngle,
  ContentVariantStatus,
  ExtendedContent,
  GenerationSource,
  MaterialKind,
} from "@/lib/types";
import {
  flattenExtended,
  generateProposals,
  type GenerateInput,
  type GeneratedProposal,
} from "@/lib/campaigns/swedish-templates";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function listCampaigns() {
  const db = getDb();
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).all();
}

export function getCampaignBundle(idOrSlug: string) {
  const db = getDb();
  const campaign =
    db.select().from(campaigns).where(eq(campaigns.id, idOrSlug)).get() ||
    db.select().from(campaigns).where(eq(campaigns.slug, idOrSlug)).get();
  if (!campaign) return null;

  const mats = db
    .select()
    .from(materials)
    .where(eq(materials.campaignId, campaign.id))
    .orderBy(asc(materials.sortOrder))
    .all();
  const variants = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .orderBy(desc(contentVariants.updatedAt))
    .all();

  return { campaign, materials: mats, contentVariants: variants };
}

export function createCampaign(input: {
  name: string;
  product: string;
  goal: string;
  destinationUrl: string;
  market?: string;
  region?: string | null;
  context?: CampaignContext;
  isDemo?: boolean;
  slug?: string;
}) {
  const db = getDb();
  const ts = nowIso();
  const baseSlug = input.slug?.trim() || slugify(input.name) || newId("cmp");
  let slug = baseSlug;
  let n = 2;
  while (db.select().from(campaigns).where(eq(campaigns.slug, slug)).get()) {
    slug = `${baseSlug}-${n++}`;
  }

  const id = newId("cmp");
  db.insert(campaigns)
    .values({
      id,
      slug,
      name: input.name.trim(),
      product: input.product.trim(),
      goal: input.goal.trim(),
      destinationUrl: input.destinationUrl.trim(),
      market: input.market?.trim() || "SE",
      region: input.region?.trim() || null,
      status: "draft",
      startsAt: null,
      endsAt: null,
      contextJson: JSON.stringify(input.context ?? {}),
      planningReadyAt: null,
      isDemo: Boolean(input.isDemo),
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return getCampaignBundle(id)!;
}

export function updateCampaign(
  id: string,
  patch: Partial<{
    name: string;
    product: string;
    goal: string;
    destinationUrl: string;
    market: string;
    region: string | null;
    status: CampaignStatus;
    context: CampaignContext;
    planningReadyAt: string | null;
  }>,
) {
  const db = getDb();
  const existing = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!existing) return null;

  const ts = nowIso();
  db.update(campaigns)
    .set({
      name: patch.name?.trim() ?? existing.name,
      product: patch.product?.trim() ?? existing.product,
      goal: patch.goal?.trim() ?? existing.goal,
      destinationUrl: patch.destinationUrl?.trim() ?? existing.destinationUrl,
      market: patch.market?.trim() ?? existing.market,
      region:
        patch.region !== undefined
          ? patch.region?.trim() || null
          : existing.region,
      status: patch.status ?? (existing.status as CampaignStatus),
      contextJson:
        patch.context !== undefined
          ? JSON.stringify(patch.context)
          : existing.contextJson,
      planningReadyAt:
        patch.planningReadyAt !== undefined
          ? patch.planningReadyAt
          : existing.planningReadyAt,
      updatedAt: ts,
    })
    .where(eq(campaigns.id, id))
    .run();

  return getCampaignBundle(id);
}

export function addMaterial(
  campaignId: string,
  input: {
    kind: MaterialKind;
    title: string;
    url: string;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
    durationSec?: number | null;
    userDescription?: string | null;
    sceneNotes?: string | null;
    sortOrder?: number;
  },
) {
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .get();
  if (!campaign) return null;

  const id = newId("mat");
  const ts = nowIso();
  const maxSort =
    db
      .select()
      .from(materials)
      .where(eq(materials.campaignId, campaignId))
      .all()
      .reduce((m, row) => Math.max(m, row.sortOrder ?? 0), -1) + 1;

  db.insert(materials)
    .values({
      id,
      campaignId,
      kind: input.kind,
      title: input.title.trim(),
      url: input.url.trim(),
      mimeType: input.mimeType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationSec: input.durationSec ?? null,
      sortOrder: input.sortOrder ?? maxSort,
      userDescription: input.userDescription?.trim() || null,
      sceneNotes: input.sceneNotes?.trim() || null,
      createdAt: ts,
    })
    .run();

  db.update(campaigns)
    .set({ updatedAt: ts })
    .where(eq(campaigns.id, campaignId))
    .run();

  return db.select().from(materials).where(eq(materials.id, id)).get()!;
}

export function updateMaterial(
  materialId: string,
  patch: Partial<{
    title: string;
    url: string;
    userDescription: string | null;
    sceneNotes: string | null;
  }>,
) {
  const db = getDb();
  const existing = db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
    .get();
  if (!existing) return null;

  db.update(materials)
    .set({
      title: patch.title?.trim() ?? existing.title,
      url: patch.url?.trim() ?? existing.url,
      userDescription:
        patch.userDescription !== undefined
          ? patch.userDescription?.trim() || null
          : existing.userDescription,
      sceneNotes:
        patch.sceneNotes !== undefined
          ? patch.sceneNotes?.trim() || null
          : existing.sceneNotes,
    })
    .where(eq(materials.id, materialId))
    .run();

  return db.select().from(materials).where(eq(materials.id, materialId)).get()!;
}

function insertVariantFromProposal(
  campaignId: string,
  materialId: string,
  proposal: GeneratedProposal,
) {
  const db = getDb();
  const ts = nowIso();
  const id = newId("cv");
  db.insert(contentVariants)
    .values({
      id,
      campaignId,
      materialId,
      locale: "sv-SE",
      channelHint: proposal.channelHint,
      headline: proposal.headline,
      body: proposal.body,
      cta: proposal.cta,
      label: proposal.label,
      angle: proposal.angle,
      generationSource: proposal.generationSource,
      extendedJson: JSON.stringify(proposal.extended),
      missingFieldsJson: JSON.stringify(proposal.missingFields),
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return db.select().from(contentVariants).where(eq(contentVariants.id, id)).get()!;
}

export async function generateVariantsForMaterial(
  campaignId: string,
  materialId: string,
  options?: { preferLocalModel?: boolean; replaceDrafts?: boolean },
) {
  const bundle = getCampaignBundle(campaignId);
  if (!bundle) return null;
  const material = bundle.materials.find((m) => m.id === materialId);
  if (!material) return null;

  const context = (() => {
    try {
      return JSON.parse(bundle.campaign.contextJson || "{}") as CampaignContext;
    } catch {
      return {} as CampaignContext;
    }
  })();

  const input: GenerateInput = {
    product: bundle.campaign.product,
    goal: bundle.campaign.goal,
    region: bundle.campaign.region,
    destinationUrl: bundle.campaign.destinationUrl,
    materialKind: material.kind as MaterialKind,
    materialTitle: material.title,
    userDescription: material.userDescription,
    sceneNotes: material.sceneNotes,
    context,
    preferLocalModel: options?.preferLocalModel,
  };

  const proposals = await generateProposals(input);
  const db = getDb();

  if (options?.replaceDrafts !== false) {
    const drafts = db
      .select()
      .from(contentVariants)
      .where(
        and(
          eq(contentVariants.campaignId, campaignId),
          eq(contentVariants.materialId, materialId),
          eq(contentVariants.status, "draft"),
        ),
      )
      .all();
    for (const d of drafts) {
      db.delete(contentVariants).where(eq(contentVariants.id, d.id)).run();
    }
  }

  const created = proposals.map((p) =>
    insertVariantFromProposal(campaignId, materialId, p),
  );

  db.update(campaigns)
    .set({ updatedAt: nowIso() })
    .where(eq(campaigns.id, campaignId))
    .run();

  return { proposals: created, missingFields: proposals[0]?.missingFields ?? [] };
}

export function updateVariant(
  variantId: string,
  patch: Partial<{
    headline: string;
    body: string;
    cta: string | null;
    channelHint: string | null;
    label: string;
    angle: ContentAngle;
    status: ContentVariantStatus;
    extended: ExtendedContent;
    missingFields: string[];
    generationSource: GenerationSource;
  }>,
) {
  const db = getDb();
  const existing = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.id, variantId))
    .get();
  if (!existing) return null;

  let headline = patch.headline ?? existing.headline;
  let body = patch.body ?? existing.body;
  let cta = patch.cta !== undefined ? patch.cta : existing.cta;
  let extendedJson = patch.extended
    ? JSON.stringify(patch.extended)
    : existing.extendedJson;

  if (patch.extended) {
    const flat = flattenExtended(patch.extended, cta ?? "");
    headline = patch.headline ?? flat.headline;
    body = patch.body ?? flat.body;
    cta = patch.cta !== undefined ? patch.cta : flat.cta || null;
  }

  const ts = nowIso();
  db.update(contentVariants)
    .set({
      headline,
      body,
      cta,
      channelHint:
        patch.channelHint !== undefined
          ? patch.channelHint
          : existing.channelHint,
      label: patch.label ?? existing.label,
      angle: patch.angle ?? existing.angle,
      status: patch.status ?? existing.status,
      extendedJson,
      missingFieldsJson: patch.missingFields
        ? JSON.stringify(patch.missingFields)
        : existing.missingFieldsJson,
      generationSource: patch.generationSource ?? existing.generationSource,
      updatedAt: ts,
    })
    .where(eq(contentVariants.id, variantId))
    .run();

  return db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.id, variantId))
    .get()!;
}

export function approveVariant(variantId: string) {
  return updateVariant(variantId, { status: "approved" });
}

export function handoffToPlanning(campaignId: string) {
  const bundle = getCampaignBundle(campaignId);
  if (!bundle) return { ok: false as const, error: "not_found" };

  const approved = bundle.contentVariants.filter((v) => v.status === "approved");
  if (approved.length === 0) {
    return {
      ok: false as const,
      error: "need_approved_variant",
      message: "Godkänn minst en variant innan överlämning till planering.",
    };
  }
  if (bundle.materials.length === 0) {
    return {
      ok: false as const,
      error: "need_material",
      message: "Lägg till minst ett material innan överlämning.",
    };
  }

  const updated = updateCampaign(campaignId, {
    status: "ready",
    planningReadyAt: nowIso(),
  });

  return { ok: true as const, bundle: updated };
}
