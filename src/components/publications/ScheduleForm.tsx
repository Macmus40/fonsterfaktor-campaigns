"use client";

import { useState } from "react";
import type { ContentVariant, PublishMode, Publication } from "@/lib/types";

type Props = {
  campaignId: string;
  variants: ContentVariant[];
  onCreated: (publication: Publication) => void;
  defaultDay?: string | null;
};

const channels = [
  { id: "facebook_page", label: "Facebook Page (dzień 1)" },
  { id: "instagram", label: "Instagram (poza day-1 testem)" },
] as const;

export function ScheduleForm({
  campaignId,
  variants,
  onCreated,
  defaultDay,
}: Props) {
  const approved = variants.filter((v) => v.status === "approved");
  const [contentVariantId, setContentVariantId] = useState(
    approved[0]?.id ?? "",
  );
  const [channel, setChannel] = useState<(typeof channels)[number]["id"]>(
    "facebook_page",
  );
  const [publishMode, setPublishMode] = useState<PublishMode>("test");
  const [scheduledAtLocal, setScheduledAtLocal] = useState(
    defaultDay ? `${defaultDay}T10:00` : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          contentVariantId,
          channel,
          publishMode,
          scheduledAtLocal: scheduledAtLocal || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Schedule failed");
      onCreated(data.publication as Publication);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4"
      data-testid="schedule-form"
    >
      <div>
        <h3 className="text-sm font-semibold text-stone-900">
          Zaplanuj publikację
        </h3>
        <p className="text-xs text-stone-500">
          Tylko zatwierdzone warianty. Czas w Europe/Stockholm.
        </p>
      </div>

      {approved.length === 0 ? (
        <p className="text-sm text-amber-800">
          Brak zatwierdzonych wariantów — wyślij jest zablokowany.
        </p>
      ) : (
        <>
          <label className="block text-xs text-stone-600">
            Zatwierdzony wariant
            <select
              className="mt-1 w-full rounded border border-stone-300 px-2 py-2 text-sm"
              value={contentVariantId}
              onChange={(e) => setContentVariantId(e.target.value)}
              required
            >
              {approved.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}: {v.headline}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-stone-600">
            Kanał
            <select
              className="mt-1 w-full rounded border border-stone-300 px-2 py-2 text-sm"
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as (typeof channels)[number]["id"])
              }
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-stone-600">
            Termin (Europe/Stockholm)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-2 text-sm"
              value={scheduledAtLocal}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
              required
            />
          </label>

          <fieldset className="space-y-1 text-xs text-stone-600">
            <legend className="mb-1">Tryb wysyłki</legend>
            {(
              [
                ["manual", "Ręczny — pakiet do skopiowania"],
                ["test", "Testowy — symulacja sukcesu/błędu"],
                ["connected", "Połączony — Meta Graph API (serwer)"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="publishMode"
                  checked={publishMode === value}
                  onChange={() => setPublishMode(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            disabled={busy}
            className="rounded bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {busy ? "Zapisuję…" : "Zapisz w kalendarzu"}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
