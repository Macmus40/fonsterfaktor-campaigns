"use client";

type Props = {
  kind: string;
  url: string;
  title: string;
};

export function MaterialPreview({ kind, url, title }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-900/95 shadow-sm">
      <div className="border-b border-stone-700 px-3 py-2 text-xs uppercase tracking-wide text-stone-300">
        Originalmaterial · {kind}
      </div>
      {kind === "video" ? (
        <video
          className="aspect-video w-full bg-black object-contain"
          src={url}
          controls
          preload="metadata"
          title={title}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title}
          className="aspect-video w-full object-cover"
        />
      )}
      <p className="truncate px-3 py-2 text-sm text-stone-200">{title}</p>
    </div>
  );
}
