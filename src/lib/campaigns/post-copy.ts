/** Pure helpers for slogans, hashtags and carousel order in the post studio. */

import type { ContentAngle, ExtendedContent, Material } from "@/lib/types";
import { parseExtendedContent } from "@/lib/types";

export type PostSlide = {
  id: string;
  kind: "image" | "video";
  url: string;
  title: string;
};

const HASHTAG = /^[\p{L}\p{N}_]+$/u;

export function normalizeHashtag(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, "").replace(/^#+/, "");
  if (!cleaned || !HASHTAG.test(cleaned)) return null;
  return `#${cleaned}`;
}

export function uniqueHashtags(tags: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    if (!tag) continue;
    const normalized = normalizeHashtag(tag);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("sv-SE");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/** Split a typed or pasted hashtag field on spaces, commas and newlines. */
export function parseHashtagInput(raw: string): { tags: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const tags: string[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    const normalized = normalizeHashtag(part);
    if (normalized) tags.push(normalized);
    else invalid.push(part);
  }
  return { tags: uniqueHashtags(tags), invalid };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function defaultHashtags(
  product: string,
  angle: ContentAngle | "price_custom" | "season_problem",
): string[] {
  const productTag = product
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 28);
  const seasonal = angle === "season_problem";
  return uniqueHashtags([
    "#fönster",
    "#skjutparti",
    "#drutex",
    "#fönsterfaktor",
    "#renovering",
    seasonal ? "#energieffektivt" : "#egetmått",
    seasonal ? "#hemma" : "#konfigurator",
    productTag ? `#${productTag}` : null,
  ]).slice(0, 8);
}

export function suggestHashtags(product: string): string[] {
  return uniqueHashtags([
    ...defaultHashtags(product, "season_problem"),
    ...defaultHashtags(product, "price_custom"),
    "#nyahemmet",
    "#sverige",
  ]);
}

export function slidesForPost(
  extended: ExtendedContent | null,
  materialId: string | null,
  materials: Array<Pick<Material, "id" | "kind" | "url" | "title">>,
): PostSlide[] {
  const byId = new Map(materials.map((material) => [material.id, material]));
  const preferred = Array.isArray(extended?.slideIds)
    ? extended.slideIds
    : materialId
      ? [materialId]
      : [];
  const slides: PostSlide[] = [];
  for (const id of preferred) {
    const material = byId.get(id);
    if (!material) continue;
    slides.push({
      id: material.id,
      kind: material.kind === "video" ? "video" : "image",
      url: material.url,
      title: material.title,
    });
  }
  return slides;
}

export function libraryMaterials(
  slides: PostSlide[],
  materials: Array<Pick<Material, "id" | "kind" | "url" | "title">>,
): PostSlide[] {
  const used = new Set(slides.map((slide) => slide.id));
  return materials
    .filter((material) => !used.has(material.id))
    .map((material) => ({
      id: material.id,
      kind: material.kind === "video" ? "video" : "image",
      url: material.url,
      title: material.title,
    }));
}

export function creativeFromExtended(extended: ExtendedContent | null): {
  slogan: string;
  hashtags: string[];
  body: string;
  cta: string;
} {
  if (!extended) {
    return { slogan: "", hashtags: [], body: "", cta: "" };
  }
  if (extended.kind === "image") {
    return {
      slogan: extended.slogan?.trim() || extended.headline,
      hashtags: uniqueHashtags(extended.hashtags ?? []),
      body: extended.postText,
      cta: extended.cta,
    };
  }
  return {
    slogan: extended.slogan?.trim() || extended.opening.replace(/^Öppning:\s*/i, ""),
    hashtags: uniqueHashtags(extended.hashtags ?? []),
    body: extended.publicationDescription,
    cta: "",
  };
}

export function readVariantCreative(extendedJson: string) {
  return creativeFromExtended(parseExtendedContent(extendedJson));
}

export function channelCaption(body: string, hashtags: string[]): string {
  const text = body.trim();
  const tags = uniqueHashtags(hashtags);
  if (!text) return tags.join(" ");
  if (tags.length === 0) return text;
  return `${text}\n\n${tags.join(" ")}`;
}
