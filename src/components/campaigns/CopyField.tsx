"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
};

export function CopyField({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  readOnly,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-50"
        >
          {copied ? "Kopierad" : "Kopiera"}
        </button>
      </div>
      {multiline ? (
        <textarea
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-stone-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          rows={rows}
          value={value}
          readOnly={readOnly || !onChange}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          value={value}
          readOnly={readOnly || !onChange}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </label>
  );
}
