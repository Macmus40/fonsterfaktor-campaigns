"use client";

import { useState, type DragEvent } from "react";
import { moveItem, type PostSlide } from "@/lib/campaigns/post-copy";

const SLIDE_MIME = "application/x-ff-slide";
const LIBRARY_MIME = "application/x-ff-library";

function libraryId(event: DragEvent): string {
  const custom = event.dataTransfer.getData(LIBRARY_MIME);
  if (custom.startsWith("mat_")) return custom;
  const plain = event.dataTransfer.getData("text/plain");
  return plain.startsWith("mat_") ? plain : "";
}

type UploadedMaterial = {
  id: string;
  kind: string;
  title: string;
  url: string;
};

type Props = {
  campaignId: string;
  slides: PostSlide[];
  library?: PostSlide[];
  onUploaded: (material: UploadedMaterial) => void;
  onReorder?: (ids: string[]) => void;
  onAddFromLibrary?: (id: string, index: number) => void;
  onRemove?: (id: string) => void;
  onError?: (message: string) => void;
};

export function MediaDropzone({
  campaignId,
  slides,
  library = [],
  onUploaded,
  onReorder,
  onAddFromLibrary,
  onRemove,
  onError,
}: Props) {
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function uploadFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    setUploading((count) => count + files.length);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(
          `/api/campaigns/${campaignId}/materials/upload`,
          { method: "POST", body },
        );
        const data = await res.json();
        if (!res.ok) {
          onError?.(data.message || "Kunde inte ladda upp filen.");
          continue;
        }
        onUploaded(data.material);
      }
    } catch {
      onError?.("Uppladdningen avbröts.");
    } finally {
      setUploading((count) => Math.max(0, count - files.length));
    }
  }

  function takeFiles(event: DragEvent) {
    if (event.dataTransfer.files?.length) {
      event.preventDefault();
      void uploadFiles(event.dataTransfer.files);
      return true;
    }
    return false;
  }

  function dropOnSlide(event: DragEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    if (takeFiles(event)) return;
    const fromLibrary = libraryId(event);
    if (fromLibrary && onAddFromLibrary) {
      onAddFromLibrary(fromLibrary, index);
      return;
    }
    const from = Number(event.dataTransfer.getData(SLIDE_MIME));
    if (!Number.isNaN(from) && onReorder) {
      onReorder(moveItem(slides, from, index).map((slide) => slide.id));
    }
    setDragIndex(null);
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = event.dataTransfer.files?.length
            ? "copy"
            : "move";
          setOver(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (takeFiles(event)) return;
          const fromLibrary = libraryId(event);
          if (fromLibrary && onAddFromLibrary) {
            onAddFromLibrary(fromLibrary, slides.length);
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-3 transition ${
          over
            ? "border-teal-600 bg-teal-50"
            : "border-stone-300 bg-stone-50/80"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <div>
            <p className="text-sm font-medium text-stone-900">Postens media</p>
            <p className="text-xs text-stone-500">
              {onReorder
                ? "Släpp foto eller film. Dra miniatyrerna för att byta ordning."
                : "Släpp foto eller film här. Du kan fortfarande klistra in en URL nedan."}
            </p>
          </div>
          <label className="cursor-pointer rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
            {uploading > 0 ? "Laddar upp…" : "Välj filer"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = event.target.files
                  ? Array.from(event.target.files)
                  : [];
                event.target.value = "";
                if (files.length) void uploadFiles(files);
              }}
            />
          </label>
        </div>

        {slides.length === 0 ? (
          <div className="grid h-28 place-items-center rounded-xl bg-white text-center text-sm text-stone-500">
            Inget media i posten ännu
          </div>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {slides.map((slide, index) => (
              <li
                key={slide.id}
                draggable={Boolean(onReorder)}
                onDragStart={(event) => {
                  if (!onReorder) return;
                  event.dataTransfer.setData(SLIDE_MIME, String(index));
                  event.dataTransfer.effectAllowed = "move";
                  setDragIndex(index);
                }}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropOnSlide(event, index)}
                className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-200 ring-2 ${
                  onReorder ? "cursor-grab active:cursor-grabbing" : ""
                } ${dragIndex === index ? "ring-teal-600 opacity-60" : "ring-transparent"}`}
              >
                <Thumb slide={slide} />
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-medium text-white">
                  {index + 1}
                </span>
                {onRemove ? (
                  <button
                    type="button"
                    aria-label={`Ta bort ${slide.title} från posten`}
                    onClick={() => onRemove(slide.id)}
                    className="absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded-full bg-black/70 text-xs text-white group-hover:grid"
                  >
                    ×
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {library.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
            Bibliotek · klicka eller dra in i posten
          </p>
          <ul className="flex gap-2 overflow-x-auto">
            {library.map((slide) => (
              <li
                key={slide.id}
                draggable
                onClick={() => onAddFromLibrary?.(slide.id, slides.length)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(LIBRARY_MIME, slide.id);
                  event.dataTransfer.setData("text/plain", slide.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="h-16 w-16 shrink-0 cursor-grab overflow-hidden rounded-lg bg-stone-200 ring-1 ring-stone-300 active:cursor-grabbing"
                title={slide.title}
              >
                <Thumb slide={slide} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ slide }: { slide: PostSlide }) {
  if (slide.kind === "video") {
    return (
      <video
        src={slide.url}
        muted
        className="h-full w-full object-cover"
        title={slide.title}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.url} alt={slide.title} className="h-full w-full object-cover" />
  );
}
