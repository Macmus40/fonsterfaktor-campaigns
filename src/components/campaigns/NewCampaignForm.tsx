"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewCampaignForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Svart skjutparti – innehåll",
    product: "Drutex skjutparti – svart",
    goal: "Öka prisvisningar och förfrågningar",
    destinationUrl:
      "https://example.test/konfigurator?product=skjutparti&finish=svart",
    region: "Stockholm",
  });

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDemo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skapa");
      router.push(`/campaigns/${data.campaign.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
      <h3 className="font-medium">Ny kampanj</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["name", "Namn"],
            ["product", "Produkt"],
            ["goal", "Mål"],
            ["destinationUrl", "Konfigurator-URL"],
            ["region", "Region"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1 md:[&:nth-child(3)]:col-span-2 md:[&:nth-child(4)]:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {label}
            </span>
            <input
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={create}
        className="rounded-md bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-900 disabled:opacity-50"
      >
        Skapa kampanj
      </button>
    </section>
  );
}
