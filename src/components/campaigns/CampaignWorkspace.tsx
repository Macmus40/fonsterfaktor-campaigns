"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialPreview } from "@/components/campaigns/MaterialPreview";
import { CampaignStatusBadge } from "@/components/campaigns/StatusBadge";
import { VariantEditor } from "@/components/campaigns/VariantEditor";
import type { CampaignContext } from "@/lib/types";
import { parseCampaignContext } from "@/lib/types";

type Material = {
  id: string;
  kind: string;
  title: string;
  url: string;
  userDescription: string | null;
  sceneNotes: string | null;
};

type Variant = {
  id: string;
  campaignId: string;
  materialId: string | null;
  locale: string;
  channelHint: string | null;
  headline: string;
  body: string;
  cta: string | null;
  label: string;
  angle: string;
  generationSource: string;
  extendedJson: string;
  missingFieldsJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Campaign = {
  id: string;
  slug: string;
  name: string;
  product: string;
  goal: string;
  destinationUrl: string;
  market: string;
  region: string | null;
  status: string;
  contextJson: string | null;
  planningReadyAt: string | null;
  isDemo: boolean;
};

type Bundle = {
  campaign: Campaign;
  materials: Material[];
  contentVariants: Variant[];
};

const STEPS = [
  "Produkt & mål",
  "Material",
  "Beskrivning",
  "Förslag",
  "Godkänn & planering",
] as const;

export function CampaignWorkspace({ initial }: { initial: Bundle }) {
  const [bundle, setBundle] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferLocalModel, setPreferLocalModel] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    initial.materials[0]?.id ?? null,
  );

  const ctx = useMemo(
    () => parseCampaignContext(bundle.campaign.contextJson),
    [bundle.campaign.contextJson],
  );

  const [form, setForm] = useState({
    name: bundle.campaign.name,
    product: bundle.campaign.product,
    goal: bundle.campaign.goal,
    destinationUrl: bundle.campaign.destinationUrl,
    region: bundle.campaign.region ?? "",
    season: ctx.season ?? "",
    holiday: ctx.holiday ?? "",
    weather: ctx.weather ?? "",
    productFeatures: (ctx.productFeatures ?? []).join(", "),
    priceText: ctx.priceText ?? "",
    deadlineText: ctx.deadlineText ?? "",
  });

  const [materialForm, setMaterialForm] = useState({
    kind: "image" as "image" | "video",
    title: "",
    url: "",
    userDescription: "",
    sceneNotes: "",
  });

  const selectedMaterial =
    bundle.materials.find((m) => m.id === selectedMaterialId) ??
    bundle.materials[0] ??
    null;

  const variantsForMaterial = bundle.contentVariants.filter(
    (v) => !selectedMaterial || v.materialId === selectedMaterial.id,
  );

  async function refreshFrom(next: Bundle) {
    setBundle(next);
    if (!selectedMaterialId && next.materials[0]) {
      setSelectedMaterialId(next.materials[0].id);
    }
  }

  async function saveContext() {
    setBusy(true);
    setError(null);
    try {
      const context: CampaignContext = {
        season: form.season || null,
        holiday: form.holiday || null,
        weather: form.weather || null,
        productFeatures: form.productFeatures
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        priceText: form.priceText || null,
        deadlineText: form.deadlineText || null,
        configuratorCtaUrl: form.destinationUrl || null,
      };
      const res = await fetch(`/api/campaigns/${bundle.campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          product: form.product,
          goal: form.goal,
          destinationUrl: form.destinationUrl,
          region: form.region || null,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte spara");
      await refreshFrom(data);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function addMaterial(useDemo: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${bundle.campaign.id}/materials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useDemo
              ? {
                  useDemo: true,
                  kind: materialForm.kind,
                  userDescription: materialForm.userDescription || null,
                  sceneNotes: materialForm.sceneNotes || null,
                }
              : {
                  kind: materialForm.kind,
                  title: materialForm.title || `${materialForm.kind} material`,
                  url: materialForm.url,
                  userDescription: materialForm.userDescription || null,
                  sceneNotes: materialForm.sceneNotes || null,
                },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte lägga till material");
      const refreshed = await fetch(`/api/campaigns/${bundle.campaign.id}`).then(
        (r) => r.json(),
      );
      await refreshFrom(refreshed);
      setSelectedMaterialId(data.material.id);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function saveDescription() {
    if (!selectedMaterial) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${bundle.campaign.id}/materials`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: selectedMaterial.id,
            userDescription: materialForm.userDescription,
            sceneNotes: materialForm.sceneNotes,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte spara beskrivning");
      const refreshed = await fetch(`/api/campaigns/${bundle.campaign.id}`).then(
        (r) => r.json(),
      );
      await refreshFrom(refreshed);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!selectedMaterial) return;
    setBusy(true);
    setError(null);
    try {
      // Persist description first
      await fetch(`/api/campaigns/${bundle.campaign.id}/materials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterial.id,
          userDescription: materialForm.userDescription,
          sceneNotes: materialForm.sceneNotes,
        }),
      });

      const res = await fetch(
        `/api/campaigns/${bundle.campaign.id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: selectedMaterial.id,
            preferLocalModel,
            replaceDrafts: true,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generering misslyckades");
      await refreshFrom(data);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  async function handoff() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${bundle.campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoffToPlanning: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Överlämning misslyckades");
      }
      await refreshFrom(data);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selectedMaterial) return;
    setMaterialForm((prev) => ({
      ...prev,
      kind: selectedMaterial.kind === "video" ? "video" : "image",
      title: selectedMaterial.title,
      url: selectedMaterial.url,
      userDescription: selectedMaterial.userDescription ?? "",
      sceneNotes: selectedMaterial.sceneNotes ?? "",
    }));
  }, [selectedMaterial]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Kampanjförfattande
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {bundle.campaign.name}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {bundle.campaign.product} · {bundle.campaign.slug}
            {bundle.campaign.isDemo ? " · demo" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CampaignStatusBadge status={bundle.campaign.status} />
          {bundle.campaign.planningReadyAt ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
              Redo för planering
            </span>
          ) : null}
        </div>
      </header>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                step === i
                  ? "bg-cyan-700 text-white ring-cyan-700"
                  : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-50"
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h3 className="font-medium">1. Produkt, mål och kontext</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Kampanjnamn"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Field
              label="Produkt"
              value={form.product}
              onChange={(v) => setForm({ ...form, product: v })}
            />
            <Field
              label="Mål"
              value={form.goal}
              onChange={(v) => setForm({ ...form, goal: v })}
              className="md:col-span-2"
            />
            <Field
              label="Konfigurator-URL / CTA"
              value={form.destinationUrl}
              onChange={(v) => setForm({ ...form, destinationUrl: v })}
              className="md:col-span-2"
            />
            <Field
              label="Region"
              value={form.region}
              onChange={(v) => setForm({ ...form, region: v })}
              placeholder="t.ex. Stockholm, Skåne"
            />
            <Field
              label="Säsong / årstid"
              value={form.season}
              onChange={(v) => setForm({ ...form, season: v })}
              placeholder="vår / sommar / höst / vinter"
            />
            <Field
              label="Högtid"
              value={form.holiday}
              onChange={(v) => setForm({ ...form, holiday: v })}
              placeholder="jul, påsk, midsommar…"
            />
            <Field
              label="Väder"
              value={form.weather}
              onChange={(v) => setForm({ ...form, weather: v })}
              placeholder="kyla, regn, sol…"
            />
            <Field
              label="Produktfakta (kommaseparerat)"
              value={form.productFeatures}
              onChange={(v) => setForm({ ...form, productFeatures: v })}
              placeholder="U-värde 0.8, svart alu, 3-glas"
              className="md:col-span-2"
            />
            <Field
              label="Pris (valfritt – utelämnas om tomt)"
              value={form.priceText}
              onChange={(v) => setForm({ ...form, priceText: v })}
              placeholder="t.ex. 18 900 kr"
            />
            <Field
              label="Tidsfrist (valfritt)"
              value={form.deadlineText}
              onChange={(v) => setForm({ ...form, deadlineText: v })}
              placeholder="t.ex. 31 december"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveContext}
            className="rounded-md bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-900 disabled:opacity-50"
          >
            Spara och fortsätt
          </button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h3 className="font-medium">2. Lägg till foto eller film</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ring-1 ${
                materialForm.kind === "image"
                  ? "bg-stone-900 text-white ring-stone-900"
                  : "bg-white ring-stone-300"
              }`}
              onClick={() => setMaterialForm({ ...materialForm, kind: "image" })}
            >
              Foto
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ring-1 ${
                materialForm.kind === "video"
                  ? "bg-stone-900 text-white ring-stone-900"
                  : "bg-white ring-stone-300"
              }`}
              onClick={() => setMaterialForm({ ...materialForm, kind: "video" })}
            >
              Film
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Titel"
              value={materialForm.title}
              onChange={(v) => setMaterialForm({ ...materialForm, title: v })}
            />
            <Field
              label="URL (eller använd demo)"
              value={materialForm.url}
              onChange={(v) => setMaterialForm({ ...materialForm, url: v })}
              placeholder="/demo/… eller https://…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => addMaterial(true)}
              className="rounded-md bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-900 disabled:opacity-50"
            >
              Lägg till demomaterial ({materialForm.kind})
            </button>
            <button
              type="button"
              disabled={busy || !materialForm.url.trim()}
              onClick={() => addMaterial(false)}
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
            >
              Lägg till egen URL
            </button>
          </div>
          {bundle.materials.length > 0 ? (
            <ul className="space-y-2 border-t border-stone-100 pt-4">
              {bundle.materials.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaterialId(m.id);
                      setStep(2);
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      selectedMaterial?.id === m.id
                        ? "border-cyan-600 bg-cyan-50"
                        : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className="text-stone-500"> · {m.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h3 className="font-medium">3. Beskriv materialet</h3>
          {!selectedMaterial ? (
            <p className="text-sm text-stone-600">Välj eller lägg till material först.</p>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <MaterialPreview
                  kind={selectedMaterial.kind}
                  url={selectedMaterial.url}
                  title={selectedMaterial.title}
                />
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Beskrivning av materialet
                    </span>
                    <textarea
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                      rows={4}
                      value={materialForm.userDescription}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          userDescription: e.target.value,
                        })
                      }
                      placeholder="Vad syns? Färg, miljö, USP…"
                    />
                  </label>
                  {selectedMaterial.kind === "video" ||
                  materialForm.kind === "video" ? (
                    <label className="block space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Scenbeskrivning (valfritt)
                      </span>
                      <textarea
                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                        rows={4}
                        value={materialForm.sceneNotes}
                        onChange={(e) =>
                          setMaterialForm({
                            ...materialForm,
                            sceneNotes: e.target.value,
                          })
                        }
                        placeholder="Scen 1: fasad… Scen 2: öppning…"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={preferLocalModel}
                    onChange={(e) => setPreferLocalModel(e.target.checked)}
                  />
                  Försök lokal modell (om LOCAL_LLM_URL är satt)
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveDescription}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
                >
                  Spara beskrivning
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={generate}
                  className="rounded-md bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-900 disabled:opacity-50"
                >
                  Generera 2 svenska förslag
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 3 || step === 4 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">
              {step === 3
                ? "4. Redigera förslag"
                : "5. Godkänn & överlämna till planering"}
            </h3>
            {step === 3 ? (
              <button
                type="button"
                disabled={busy || !selectedMaterial}
                onClick={generate}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
              >
                Generera om
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              {selectedMaterial ? (
                <MaterialPreview
                  kind={selectedMaterial.kind}
                  url={selectedMaterial.url}
                  title={selectedMaterial.title}
                />
              ) : (
                <p className="text-sm text-stone-500">Inget material valt.</p>
              )}
              {bundle.materials.length > 1 ? (
                <div className="mt-3 space-y-1">
                  {bundle.materials.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(m.id)}
                      className={`block w-full rounded border px-2 py-1 text-left text-xs ${
                        selectedMaterial?.id === m.id
                          ? "border-cyan-600 bg-cyan-50"
                          : "border-stone-200"
                      }`}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-4 lg:col-span-3">
              {variantsForMaterial.length === 0 ? (
                <p className="rounded-md border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
                  Inga varianter ännu. Gå till steg 3 och generera förslag.
                </p>
              ) : (
                variantsForMaterial.map((v) => (
                  <VariantEditor
                    key={v.id}
                    variant={v as never}
                    campaignId={bundle.campaign.id}
                    onSaved={(b) => refreshFrom(b as Bundle)}
                  />
                ))
              )}
            </div>
          </div>

          {step === 4 ||
          bundle.contentVariants.some((v) => v.status === "approved") ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-sm text-blue-950">
                När minst en variant är godkänd kan kampanjen lämnas till
                planering (status <code>ready</code>). Publicering sköts av
                Agent 3.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handoff}
                className="mt-3 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                Överlämna till planering
              </button>
              {bundle.campaign.status === "ready" ? (
                <p className="mt-2 text-sm font-medium text-blue-900">
                  Kampanjen är markerad som redo. Öppna den igen efter omstart
                  via översikten — SQLite behåller data.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </span>
      <input
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-700"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
