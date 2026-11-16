"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlatformStatsForm({
  campaignId,
  publications,
}: {
  campaignId: string;
  publications: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [publicationId, setPublicationId] = useState(publications[0]?.id ?? "");
  const [metric, setMetric] = useState("reach");
  const [value, setValue] = useState("1000");
  const [channel, setChannel] = useState("meta");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/analytics/platform-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          publicationId: publicationId || null,
          channel,
          metric,
          value: Number(value),
          dataSource: "manual",
          verified: false,
          notes: "Ręczny wpis z panelu analityki",
          periodStart: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          periodEnd: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Błąd zapisu");
      } else {
        setMessage(
          `Zapisano ${metric}=${value} (źródło: manual, verified=false)`,
        );
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Błąd sieci");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-stone-200 bg-white p-5"
      data-testid="platform-stats-form"
    >
      <h3 className="font-medium">Ręczny wpis statystyk platformy</h3>
      <p className="text-sm text-stone-600">
        Zasięg, interakcje i wydatki kampanii na start wprowadzane ręcznie z
        oznaczeniem źródła <code>manual</code>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          Publikacja
          <select
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            value={publicationId}
            onChange={(e) => setPublicationId(e.target.value)}
          >
            {publications.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Kanał
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Metryka
          <select
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="reach">reach</option>
            <option value="interactions">interactions</option>
            <option value="spend">spend</option>
            <option value="impressions">impressions</option>
          </select>
        </label>
        <label className="text-sm">
          Wartość
          <input
            type="number"
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Zapis…" : "Zapisz (manual)"}
      </button>
      {message ? <p className="text-sm text-stone-600">{message}</p> : null}
    </form>
  );
}
