"use client";

import { useMemo, useState } from "react";
import { CopyField } from "@/components/campaigns/CopyField";
import { VariantStatusBadge } from "@/components/campaigns/StatusBadge";
import { angleLabel, generationSourceLabel } from "@/lib/campaigns/labels";
import type {
  ContentAngle,
  ContentVariant,
  ExtendedContent,
  GenerationSource,
  ImageExtendedContent,
  VideoExtendedContent,
} from "@/lib/types";
import { parseExtendedContent, parseMissingFields } from "@/lib/types";

type Props = {
  variant: ContentVariant;
  campaignId: string;
  onSaved: (bundle: unknown) => void;
};

export function VariantEditor({ variant, campaignId, onSaved }: Props) {
  const initial = useMemo(
    () => parseExtendedContent(variant.extendedJson),
    [variant.extendedJson],
  );
  const [extended, setExtended] = useState<ExtendedContent | null>(initial);
  const [headline, setHeadline] = useState(variant.headline);
  const [body, setBody] = useState(variant.body);
  const [cta, setCta] = useState(variant.cta ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const missing = parseMissingFields(variant.missingFieldsJson);

  async function save(approve = false) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/variants/${variant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approve,
            headline,
            body,
            cta: cta || null,
            extended: extended ?? undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || data.error || "Kunde inte spara");
        return;
      }
      onSaved(data.bundle);
      setMessage(approve ? "Variant godkänd" : "Sparad");
    } finally {
      setSaving(false);
    }
  }

  if (!extended) {
    return (
      <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
        Saknar utökad JSON för varianten.
      </div>
    );
  }

  return (
    <article
      className={`space-y-4 rounded-lg border p-4 ${
        variant.status === "approved"
          ? "border-emerald-400 bg-emerald-50/40"
          : "border-amber-300 bg-amber-50/30"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-900">
            Variant {variant.label} ·{" "}
            {angleLabel(variant.angle as ContentAngle)}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {generationSourceLabel(
              variant.generationSource as GenerationSource,
            )}
            {variant.channelHint ? ` · ${variant.channelHint}` : ""}
          </p>
        </div>
        <VariantStatusBadge status={variant.status} />
      </div>

      {missing.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Saknas i underlaget (utelämnat i texten):{" "}
          <strong>{missing.join(", ")}</strong>. Komplettera kontexten och
          generera om, eller lämna som det är.
        </div>
      ) : null}

      {extended.kind === "image" ? (
        <ImageFields
          extended={extended}
          onChange={(next) => {
            setExtended(next);
            setHeadline(next.headline);
            setBody(next.postText);
            setCta(next.cta);
          }}
        />
      ) : (
        <VideoFields
          extended={extended}
          onChange={(next) => {
            setExtended(next);
            setHeadline(next.opening);
            setBody(
              [
                next.narration,
                "",
                "Textsekvens:",
                ...next.overlaySequence.map((t, i) => `${i + 1}. ${t}`),
                "",
                next.publicationDescription,
              ].join("\n"),
            );
          }}
        />
      )}

      <CopyField label="CTA (platt fält)" value={cta} onChange={setCta} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => save(false)}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
        >
          Spara utkast
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => save(true)}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Godkänn variant
        </button>
        {message ? (
          <span className="self-center text-sm text-stone-600">{message}</span>
        ) : null}
      </div>
    </article>
  );
}

function ImageFields({
  extended,
  onChange,
}: {
  extended: ImageExtendedContent;
  onChange: (v: ImageExtendedContent) => void;
}) {
  return (
    <div className="space-y-3">
      <CopyField
        label="Rubrik"
        value={extended.headline}
        onChange={(headline) => onChange({ ...extended, headline })}
      />
      <CopyField
        label="Inläggstext"
        value={extended.postText}
        multiline
        rows={4}
        onChange={(postText) => onChange({ ...extended, postText })}
      />
      <CopyField
        label="Karuselltexter (en per rad)"
        value={extended.carouselCaptions.join("\n")}
        multiline
        rows={4}
        onChange={(raw) =>
          onChange({
            ...extended,
            carouselCaptions: raw
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
          })
        }
      />
      <CopyField
        label="CTA till konfigurator"
        value={extended.cta}
        onChange={(cta) => onChange({ ...extended, cta })}
      />
    </div>
  );
}

function VideoFields({
  extended,
  onChange,
}: {
  extended: VideoExtendedContent;
  onChange: (v: VideoExtendedContent) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        v1: filmtexter är redigerbara och kopierbara (ingen inbränning i videon).
      </p>
      <CopyField
        label="Öppning"
        value={extended.opening}
        onChange={(opening) => onChange({ ...extended, opening })}
      />
      <CopyField
        label="Textsekvens på skärm (en per rad)"
        value={extended.overlaySequence.join("\n")}
        multiline
        rows={4}
        onChange={(raw) =>
          onChange({
            ...extended,
            overlaySequence: raw
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
          })
        }
      />
      <CopyField
        label="Narrationsförslag"
        value={extended.narration}
        multiline
        rows={4}
        onChange={(narration) => onChange({ ...extended, narration })}
      />
      <CopyField
        label="Publiceringsbeskrivning"
        value={extended.publicationDescription}
        multiline
        rows={3}
        onChange={(publicationDescription) =>
          onChange({ ...extended, publicationDescription })
        }
      />
    </div>
  );
}
