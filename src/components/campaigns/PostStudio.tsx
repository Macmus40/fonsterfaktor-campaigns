"use client";

import { useMemo, useState } from "react";
import { ChannelPreviews } from "@/components/campaigns/ChannelPreviews";
import { CopyField } from "@/components/campaigns/CopyField";
import { MediaDropzone } from "@/components/campaigns/MediaDropzone";
import { VariantStatusBadge } from "@/components/campaigns/StatusBadge";
import { angleLabel, generationSourceLabel } from "@/lib/campaigns/labels";
import {
  libraryMaterials,
  moveItem,
  normalizeHashtag,
  parseHashtagInput,
  slidesForPost,
  suggestHashtags,
  uniqueHashtags,
  type PostSlide,
} from "@/lib/campaigns/post-copy";
import type {
  ContentAngle,
  ContentVariant,
  ExtendedContent,
  GenerationSource,
  ImageExtendedContent,
  Material,
  VideoExtendedContent,
} from "@/lib/types";
import { parseExtendedContent, parseMissingFields } from "@/lib/types";

const LINE_MIME = "application/x-ff-line";

type Props = {
  campaignId: string;
  product: string;
  variants: ContentVariant[];
  materials: Material[];
  onSaved: (bundle: unknown) => void;
  onLibraryChange: () => Promise<void> | void;
};

export function PostStudio({
  campaignId,
  product,
  variants,
  materials,
  onSaved,
  onLibraryChange,
}: Props) {
  const [activeId, setActiveId] = useState(variants[0]?.id ?? "");
  const active = variants.find((variant) => variant.id === activeId) ?? variants[0];

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
        Inga utkast ännu. Beskriv materialet och generera två svenska förslag,
        så öppnas studion med slogan, hashtags och kanalernas förhandsvisning.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const selected = variant.id === active.id;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => setActiveId(variant.id)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                selected
                  ? "bg-stone-900 text-white ring-stone-900"
                  : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"
              }`}
            >
              Variant {variant.label} · {angleLabel(variant.angle as ContentAngle)}
            </button>
          );
        })}
      </div>
      <DraftEditor
        key={active.id}
        variant={active}
        campaignId={campaignId}
        product={product}
        materials={materials}
        onSaved={onSaved}
        onLibraryChange={onLibraryChange}
      />
    </div>
  );
}

function DraftEditor({
  variant,
  campaignId,
  product,
  materials,
  onSaved,
  onLibraryChange,
}: {
  variant: ContentVariant;
  campaignId: string;
  product: string;
  materials: Material[];
  onSaved: (bundle: unknown) => void;
  onLibraryChange: () => Promise<void> | void;
}) {
  const initial = parseExtendedContent(variant.extendedJson);
  const creative = useMemo(() => readDraft(variant, initial), [variant, initial]);
  const [slogan, setSlogan] = useState(creative.slogan);
  const [body, setBody] = useState(creative.body);
  const [cta, setCta] = useState(creative.cta || variant.cta || "");
  const [hashtags, setHashtags] = useState(creative.hashtags);
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [slideIds, setSlideIds] = useState(creative.slideIds);
  const [slideIndex, setSlideIndex] = useState(0);
  const [captions, setCaptions] = useState(creative.captions);
  const [opening, setOpening] = useState(creative.opening);
  const [narration, setNarration] = useState(creative.narration);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slides = useMemo(() => {
    const extended = initial ? { ...initial, slideIds } : null;
    return slidesForPost(extended, variant.materialId, materials);
  }, [initial, materials, slideIds, variant.materialId]);
  const library = libraryMaterials(slides, materials);
  const suggestions = suggestHashtags(product).filter(
    (tag) => !hashtags.some((own) => own.toLocaleLowerCase("sv-SE") === tag.toLocaleLowerCase("sv-SE")),
  );
  const missing = parseMissingFields(variant.missingFieldsJson);
  const safeIndex = slides.length === 0 ? 0 : slideIndex % slides.length;

  function addTags(raw: string) {
    const parsed = parseHashtagInput(raw);
    if (parsed.invalid.length) {
      setTagError(`Hoppade över: ${parsed.invalid.join(", ")}`);
    } else {
      setTagError(null);
    }
    if (parsed.tags.length) {
      setHashtags((current) => uniqueHashtags([...current, ...parsed.tags]));
    }
    setTagDraft("");
  }

  function buildExtended(): ExtendedContent | null {
    if (!initial) return null;
    if (initial.kind === "image") {
      const next: ImageExtendedContent = {
        ...initial,
        headline: slogan.trim() || initial.headline,
        slogan: slogan.trim(),
        postText: body,
        cta,
        hashtags,
        slideIds,
        carouselCaptions: captions,
      };
      return next;
    }
    const next: VideoExtendedContent = {
      ...initial,
      opening: opening.trim() || initial.opening,
      slogan: slogan.trim(),
      publicationDescription: body,
      hashtags,
      slideIds,
      overlaySequence: captions,
      narration,
    };
    return next;
  }

  async function save(approve: boolean) {
    const extended = buildExtended();
    if (!extended) {
      setError("Varianten saknar utökad text.");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/variants/${variant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approve,
            headline: slogan.trim() || variant.headline,
            cta: cta || null,
            extended,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Kunde inte spara");
        return;
      }
      onSaved(data.bundle);
      setMessage(approve ? "Variant godkänd" : "Sparad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <div className="order-2 space-y-4 xl:order-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">
              {generationSourceLabel(variant.generationSource as GenerationSource)}
              {variant.channelHint ? ` · ${variant.channelHint}` : ""}
            </p>
          </div>
          <VariantStatusBadge status={variant.status} />
        </div>

        {missing.length > 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Saknas i underlaget och är utelämnat i texten:{" "}
            <strong>{missing.join(", ")}</strong>.
          </div>
        ) : null}

        <MediaDropzone
          campaignId={campaignId}
          slides={slides}
          library={library}
          onError={setError}
          onUploaded={async (material) => {
            setSlideIds((current) =>
              current.includes(material.id) ? current : [...current, material.id],
            );
            await onLibraryChange();
          }}
          onReorder={(ids) => {
            setSlideIds(ids);
            setSlideIndex(0);
          }}
          onAddFromLibrary={(id, index) => {
            setSlideIds((current) => {
              const without = current.filter((item) => item !== id);
              const next = without.slice();
              next.splice(Math.min(index, next.length), 0, id);
              return next;
            });
          }}
          onRemove={(id) =>
            setSlideIds((current) => current.filter((item) => item !== id))
          }
        />

        <label className="block space-y-1.5">
          <span className="flex items-baseline justify-between text-xs font-medium uppercase tracking-wide text-stone-500">
            Slogan
            <span className="font-normal normal-case tracking-normal text-stone-400">
              {slogan.trim().length} tecken · stor i Story och annons
            </span>
          </span>
          <input
            value={slogan}
            onChange={(event) => setSlogan(event.target.value)}
            placeholder="Kort reklamrad, t.ex. Svart skjutparti i eget mått"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-lg font-medium text-stone-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </label>

        <CopyField
          label={initial?.kind === "video" ? "Publiceringstext" : "Inläggstext"}
          value={body}
          multiline
          rows={5}
          onChange={setBody}
        />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Hashtags
            </span>
            <span className="text-xs text-stone-400">Dra för att sortera</span>
          </div>
          <ul
            className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const payload = event.dataTransfer.getData(LINE_MIME);
              if (!payload.startsWith("suggest:")) return;
              event.preventDefault();
              const suggested = normalizeHashtag(payload.slice("suggest:".length));
              if (!suggested) return;
              setHashtags((current) => uniqueHashtags([...current, suggested]));
            }}
          >
            {hashtags.length === 0 ? (
              <li className="px-1 py-1 text-sm text-stone-400">Inga hashtags ännu</li>
            ) : (
              hashtags.map((tag, index) => (
                <li
                  key={tag}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(LINE_MIME, `tag:${index}`);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const payload = event.dataTransfer.getData(LINE_MIME);
                    if (payload.startsWith("suggest:")) {
                      const suggested = normalizeHashtag(payload.slice("suggest:".length));
                      if (!suggested) return;
                      setHashtags((current) => {
                        const without = current.filter((item) => item !== suggested);
                        const next = without.slice();
                        next.splice(index, 0, suggested);
                        return uniqueHashtags(next);
                      });
                      return;
                    }
                    if (!payload.startsWith("tag:")) return;
                    const from = Number(payload.slice(4));
                    setHashtags((current) => moveItem(current, from, index));
                  }}
                  className="inline-flex cursor-grab items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-sm text-teal-900 ring-1 ring-teal-200 active:cursor-grabbing"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Ta bort ${tag}`}
                    className="text-teal-700/70 hover:text-teal-950"
                    onClick={() =>
                      setHashtags((current) => current.filter((item) => item !== tag))
                    }
                  >
                    ×
                  </button>
                </li>
              ))
            )}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (tagDraft.trim()) addTags(tagDraft);
            }}
          >
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "," || event.key === " ") {
                  if (!tagDraft.trim()) return;
                  event.preventDefault();
                  addTags(tagDraft);
                }
                if (event.key === "Backspace" && !tagDraft && hashtags.length) {
                  setHashtags((current) => current.slice(0, -1));
                }
              }}
              placeholder="#fönster, #egetmått"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
            <button
              type="submit"
              className="rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50"
            >
              Lägg till
            </button>
          </form>
          {tagError ? <p className="text-xs text-amber-800">{tagError}</p> : null}
          {suggestions.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 8).map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(LINE_MIME, `suggest:${tag}`);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => setHashtags((current) => uniqueHashtags([...current, tag]))}
                    className="cursor-grab rounded-full border border-dashed border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:border-teal-600 hover:text-teal-800"
                  >
                    + {tag}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <CopyField label="Uppmaning (CTA)" value={cta} onChange={setCta} />

        <SortableLines
          label={initial?.kind === "video" ? "Text på film, dra för att byta ordning" : "Karuselltexter, en per bild"}
          lines={captions}
          onChange={setCaptions}
        />

        {initial?.kind === "video" ? (
          <details className="rounded-xl border border-stone-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium">Filmmanus</summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-stone-500">
                Texterna bränns inte in i filmen. De går att redigera och kopiera.
              </p>
              <CopyField label="Öppning" value={opening} onChange={setOpening} />
              <CopyField
                label="Narration"
                value={narration}
                multiline
                rows={4}
                onChange={setNarration}
              />
            </div>
          </details>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(false)}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            Spara utkast
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(true)}
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Godkänn variant
          </button>
          {message ? (
            <span className="self-center text-sm text-stone-600">{message}</span>
          ) : null}
        </div>
      </div>

      <div className="order-1 xl:sticky xl:top-3 xl:order-2 xl:[zoom:0.8]">
        <ChannelPreviews
          slogan={slogan}
          body={body}
          hashtags={hashtags}
          cta={cta}
          slides={slides}
          slideIndex={safeIndex}
          onSlideIndex={setSlideIndex}
        />
        {captions[safeIndex] ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-stone-600 ring-1 ring-stone-200">
            Bild {safeIndex + 1}: {captions[safeIndex]}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SortableLines({
  label,
  lines,
  onChange,
}: {
  label: string;
  lines: string[];
  onChange: (lines: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </span>
      <ul className="space-y-1.5">
        {lines.map((line, index) => (
            <li
            key={index}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(LINE_MIME, `line:${index}`);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const payload = event.dataTransfer.getData(LINE_MIME);
              if (!payload.startsWith("line:")) return;
              event.preventDefault();
              const from = Number(payload.slice(5));
              onChange(moveItem(lines, from, index));
            }}
            className="flex cursor-grab items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-stone-200 active:cursor-grabbing"
          >
            <span aria-hidden className="text-stone-300">⋮⋮</span>
            <input
              value={line}
              onChange={(event) => {
                const next = lines.slice();
                next[index] = event.target.value;
                onChange(next);
              }}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button
              type="button"
              aria-label="Ta bort rad"
              className="px-1 text-stone-400 hover:text-stone-800"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          if (!value) return;
          onChange([...lines, value]);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ny rad"
          className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
        />
        <button
          type="submit"
          className="rounded-lg border border-stone-300 bg-white px-3 text-sm hover:bg-stone-50"
        >
          Lägg till
        </button>
      </form>
    </div>
  );
}

function readDraft(variant: ContentVariant, extended: ExtendedContent | null) {
  const fallbackSlides = variant.materialId ? [variant.materialId] : [];
  if (!extended || (extended.kind !== "image" && extended.kind !== "video")) {
    return {
      slogan: variant.headline,
      body: variant.body,
      cta: variant.cta ?? "",
      hashtags: [] as string[],
      slideIds: fallbackSlides,
      captions: [] as string[],
      opening: variant.headline,
      narration: "",
    };
  }
  const slideIds =
    extended.slideIds && extended.slideIds.length > 0
      ? extended.slideIds
      : fallbackSlides;
  if (extended.kind === "image") {
    return {
      slogan: extended.slogan?.trim() || extended.headline,
      body: extended.postText,
      cta: extended.cta,
      hashtags: uniqueHashtags(extended.hashtags ?? []),
      slideIds,
      captions: extended.carouselCaptions,
      opening: "",
      narration: "",
    };
  }
  return {
    slogan:
      extended.slogan?.trim() ||
      extended.opening.replace(/^Öppning:\s*/i, ""),
    body: extended.publicationDescription,
    cta: variant.cta ?? "",
    hashtags: uniqueHashtags(extended.hashtags ?? []),
    slideIds,
    captions: extended.overlaySequence,
    opening: extended.opening,
    narration: extended.narration,
  };
}

export type { PostSlide };
