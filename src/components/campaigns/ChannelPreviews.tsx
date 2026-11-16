"use client";

import { useState, type ReactNode } from "react";
import type { PostSlide } from "@/lib/campaigns/post-copy";

type Props = {
  slogan: string;
  body: string;
  hashtags: string[];
  cta: string;
  slides: PostSlide[];
  slideIndex: number;
  onSlideIndex: (index: number) => void;
};

export function ChannelPreviews(props: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">Förhandsvisning</p>
          <p className="text-xs text-stone-500">
            Samma post, fyra ytor. Slogan, text och hashtags uppdateras direkt.
          </p>
        </div>
        {props.slides.length > 1 ? (
          <div className="flex items-center gap-1">
            <StepButton
              label="Föregående bild"
              onClick={() =>
                props.onSlideIndex(
                  (props.slideIndex - 1 + props.slides.length) % props.slides.length,
                )
              }
            >
              ‹
            </StepButton>
            <span className="min-w-12 text-center text-xs text-stone-500">
              {props.slideIndex + 1}/{props.slides.length}
            </span>
            <StepButton
              label="Nästa bild"
              onClick={() =>
                props.onSlideIndex((props.slideIndex + 1) % props.slides.length)
              }
            >
              ›
            </StepButton>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FacebookCard {...props} />
        <InstagramCard {...props} />
        <StoryCard {...props} />
        <AdCard {...props} />
      </div>
    </div>
  );
}

function StepButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full border border-stone-300 bg-white text-base leading-none text-stone-700 hover:bg-stone-50"
    >
      {children}
    </button>
  );
}

function slideAt(slides: PostSlide[], index: number) {
  if (slides.length === 0) return null;
  return slides[index % slides.length] ?? slides[0];
}

function Media({
  slide,
  className,
}: {
  slide: PostSlide | null;
  className: string;
}) {
  if (!slide) {
    return (
      <div className={`grid place-items-center bg-stone-200 text-center text-xs text-stone-500 ${className}`}>
        Släpp ett foto
        <br />
        eller en film
      </div>
    );
  }
  if (slide.kind === "video") {
    return (
      <video
        key={slide.id}
        src={slide.url}
        className={`bg-black object-cover ${className}`}
        muted
        loop
        autoPlay
        playsInline
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.url}
      alt={slide.title}
      className={`object-cover ${className}`}
    />
  );
}

function HashtagLine({ tags, className }: { tags: string[]; className: string }) {
  if (tags.length === 0) {
    return <p className={`text-xs italic text-stone-400 ${className}`}>Inga hashtags ännu</p>;
  }
  return <p className={className}>{tags.join(" ")}</p>;
}

function FacebookCard({ slogan, body, hashtags, cta, slides, slideIndex }: Props) {
  const slide = slideAt(slides, slideIndex);
  return (
    <PreviewShell title="Facebook" hint="Inlägg">
      <article className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 px-3 py-2.5">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">FönsterFaktor</p>
            <p className="text-[11px] text-stone-500">Sponsrad · Sverige</p>
          </div>
        </header>
        <div className="space-y-1 px-3 pb-2 text-[13px] leading-snug text-stone-800">
          <p className="line-clamp-3 whitespace-pre-wrap">{body.trim() || "Inläggstexten syns här."}</p>
          <HashtagLine tags={hashtags} className="line-clamp-2 text-[13px] text-[#1877F2]" />
        </div>
        <Media slide={slide} className="aspect-[16/9] max-h-36 w-full" />
        <footer className="flex items-center justify-between gap-2 border-t border-stone-100 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wide text-stone-400">
              fönsterfaktor.se
            </p>
            <p className="truncate text-[13px] font-semibold text-stone-900">
              {slogan.trim() || "Slogan"}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-[12px] font-semibold text-stone-800">
            {cta.trim() || "Läs mer"}
          </span>
        </footer>
      </article>
    </PreviewShell>
  );
}

function InstagramCard({ slogan, body, hashtags, slides, slideIndex }: Props) {
  const slide = slideAt(slides, slideIndex);
  return (
    <PreviewShell title="Instagram" hint="Flöde">
      <article className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-700 p-[2px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-white text-[10px] font-bold">
              FF
            </span>
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight">fonsterfaktor</p>
            <p className="text-[11px] text-stone-500">Sverige</p>
          </div>
        </header>
        <div className="relative">
          <Media slide={slide} className="aspect-[4/3] max-h-40 w-full" />
          {slides.length > 1 ? (
            <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
              {slideIndex + 1}/{slides.length}
            </span>
          ) : null}
        </div>
        <div className="space-y-1 px-3 py-2 text-[13px] leading-snug">
          <p className="line-clamp-2 font-semibold">{slogan.trim() || "Slogan"}</p>
          <p className="line-clamp-2 whitespace-pre-wrap text-stone-800">
            {body.trim() || "Bildtexten syns under sloganen."}
          </p>
          <HashtagLine tags={hashtags} className="line-clamp-2 text-[13px] text-sky-800" />
        </div>
      </article>
    </PreviewShell>
  );
}

function StoryCard({ slogan, hashtags, cta, slides, slideIndex }: Props) {
  const slide = slideAt(slides, slideIndex);
  return (
    <PreviewShell title="Instagram" hint="Story">
      <article className="relative mx-auto aspect-[9/16] w-full max-w-[168px] overflow-hidden rounded-[22px] bg-stone-900 shadow-sm ring-1 ring-stone-300">
        <Media slide={slide} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {Array.from({ length: Math.max(slides.length, 1) }).map((_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${
                i <= slideIndex ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
        <header className="absolute left-3 right-3 top-6 flex items-center gap-2 text-white">
          <BrandMark />
          <p className="text-[12px] font-semibold">fonsterfaktor</p>
          <p className="text-[11px] text-white/70">3s</p>
        </header>
        <div className="absolute inset-x-4 bottom-16 text-white">
          <p className="line-clamp-4 text-balance text-lg font-semibold leading-tight drop-shadow">
            {slogan.trim() || "Din slogan"}
          </p>
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <HashtagLine
            tags={hashtags.slice(0, 4)}
            className="text-[11px] text-white/90"
          />
          <div className="rounded-full bg-white px-3 py-1.5 text-center text-[12px] font-semibold text-stone-900">
            {cta.trim() || "Svep upp"}
          </div>
        </div>
      </article>
    </PreviewShell>
  );
}

function AdCard({ slogan, body, hashtags, cta, slides, slideIndex }: Props) {
  const slide = slideAt(slides, slideIndex);
  const firstLine = body.trim().split("\n").find(Boolean) || "";
  return (
    <PreviewShell title="Annons" hint="Slogan">
      <article className="overflow-hidden rounded-xl border border-stone-200 bg-stone-950 text-white shadow-sm">
        <div className="relative">
          <Media slide={slide} className="aspect-[16/10] max-h-48 w-full opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
          <p className="absolute left-3 top-3 rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
            Annons
          </p>
          <div className="absolute inset-x-4 bottom-4 space-y-3">
            <p className="line-clamp-3 text-balance text-xl font-semibold leading-tight">
              {slogan.trim() || "Skriv en slogan"}
            </p>
            {firstLine ? (
              <p className="line-clamp-2 text-sm text-white/80">{firstLine}</p>
            ) : null}
            {hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {hashtags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] italic text-white/60">Inga hashtags ännu</p>
            )}
            <span className="inline-flex rounded-full bg-teal-400 px-3 py-1.5 text-xs font-semibold text-stone-950">
              {cta.trim() || "Till konfiguratorn"}
            </span>
          </div>
        </div>
      </article>
    </PreviewShell>
  );
}

function PreviewShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium text-stone-600">
          <span className="text-stone-900">{title}</span>
          <span className="text-stone-400"> · {hint}</span>
        </p>
        <button
          type="button"
          className="text-[11px] text-stone-500 hover:text-stone-800"
          onClick={async (event) => {
            const card = event.currentTarget.parentElement?.nextElementSibling;
            const text = card?.textContent?.replace(/\s+\n/g, "\n").trim() ?? "";
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Kopierad" : "Kopiera"}
        </button>
      </div>
      {children}
    </section>
  );
}

function BrandMark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-800 text-[11px] font-bold text-white">
      FF
    </span>
  );
}
