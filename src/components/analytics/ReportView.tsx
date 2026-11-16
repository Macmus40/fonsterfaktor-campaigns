import type { CampaignReport } from "@/lib/analytics/report";
import type { WeeklySummary } from "@/lib/analytics/weekly-summary";

function FunnelTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    key: string;
    label: string;
    sub?: string | null;
    funnel: CampaignReport["totals"];
  }>;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Wymiar</th>
              <th className="px-4 py-3">Zasięg*</th>
              <th className="px-4 py-3">Interakcje*</th>
              <th className="px-4 py-3">Przejścia</th>
              <th className="px-4 py-3">Podglądy botów</th>
              <th className="px-4 py-3">Wyceny</th>
              <th className="px-4 py-3">Zapytania</th>
              <th className="px-4 py-3">Wydatki*</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-stone-900">{r.label}</div>
                  {r.sub ? (
                    <div className="text-xs text-stone-500">{r.sub}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{r.funnel.platformReach}</td>
                <td className="px-4 py-3">{r.funnel.platformInteractions}</td>
                <td className="px-4 py-3 font-medium">{r.funnel.transitions}</td>
                <td className="px-4 py-3 text-stone-500">
                  {r.funnel.linkPreviews}
                </td>
                <td className="px-4 py-3">{r.funnel.priceViews}</td>
                <td className="px-4 py-3 font-medium">{r.funnel.inquiries}</td>
                <td className="px-4 py-3">
                  {r.funnel.platformSpend
                    ? `${r.funnel.platformSpend} SEK`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">
        * Statystyki platformy (zasięg / interakcje / wydatki) mają oznaczone
        źródło danych. Przejścia = przekierowania tagged linków (bez botów) —
        nie są liczbą unikalnych klientów.
      </p>
    </section>
  );
}

export function ReportView({
  report,
  summary,
}: {
  report: CampaignReport;
  summary: WeeklySummary;
}) {
  const noConversion =
    report.conversionMeasurementStatus === "brak_pomiaru_konwersji";

  return (
    <div className="space-y-10" data-testid="analytics-report">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-800">
          Analityka · {report.campaign.slug}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {report.campaign.name}
        </h2>
        <p className="max-w-2xl text-stone-600">
          Wyniki według kanału, publikacji, wariantu i okresu. Konfigurator:{" "}
          <span className="break-all font-mono text-xs text-stone-700">
            {report.campaign.destinationUrl}
          </span>
        </p>
        <div
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm ${
            noConversion
              ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
              : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
          }`}
          data-testid="conversion-status"
        >
          {report.conversionMeasurementLabel}
        </div>
      </section>

      <FunnelTable
        title="Według publikacji"
        rows={report.byPublication.map((p) => ({
          key: p.publicationId,
          label: `Wariant ${p.contentVariantLabel ?? "?"} · ${p.channel}`,
          sub: p.taggedPath
            ? `${p.taggedPath} · źródła: ${
                p.platformStatsSource
                  .map((s) => `${s.metric}=${s.dataSource}`)
                  .join(", ") || "brak wpisów platformy"
              }`
            : "brak linku",
          funnel: p.funnel,
        }))}
      />

      <FunnelTable
        title="Według kanału"
        rows={report.byChannel.map((c) => ({
          key: c.channel,
          label: c.channel,
          funnel: c.funnel,
        }))}
      />

      <FunnelTable
        title="Według wariantu"
        rows={report.byVariant.map((v) => ({
          key: v.contentVariantId ?? "none",
          label: `Wariant ${v.label ?? "—"}`,
          sub: v.headline,
          funnel: v.funnel,
        }))}
      />

      <section
        className="space-y-4 rounded-md border border-stone-200 bg-white p-6"
        data-testid="weekly-summary"
      >
        <div>
          <h3 className="text-lg font-semibold">Tygodniowe podsumowanie</h3>
          <p className="text-sm text-stone-500">{summary.periodLabel}</p>
        </div>

        {!summary.sampleSizeOk ? (
          <p
            className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900"
            data-testid="insufficient-sample"
          >
            {summary.sampleNotes.join(" ")}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <article className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              1. Co się zmieniło
            </p>
            <h4 className="font-medium">{summary.whatChanged.headline}</h4>
            <p className="text-sm text-stone-600">{summary.whatChanged.detail}</p>
            <pre className="overflow-x-auto rounded bg-stone-50 p-2 text-xs text-stone-700">
              {JSON.stringify(summary.whatChanged.numbers, null, 2)}
            </pre>
          </article>
          <article className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              2. Gdzie klienci odpadają
            </p>
            <h4 className="font-medium">{summary.dropOff.headline}</h4>
            <p className="text-sm text-stone-600">{summary.dropOff.detail}</p>
            <ul className="space-y-1 text-xs text-stone-600">
              {summary.dropOff.stages.map((s) => (
                <li key={`${s.from}-${s.to}`}>
                  {s.from} → {s.to}:{" "}
                  {s.rate === null ? "n/d" : `${Math.round(s.rate * 1000) / 10}%`}{" "}
                  (odpada {s.lost})
                </li>
              ))}
            </ul>
          </article>
          <article className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              3. Jeden test dalej
            </p>
            <h4 className="font-medium">{summary.nextTest.headline}</h4>
            <p className="text-sm text-stone-600">
              {summary.nextTest.recommendation}
            </p>
            {summary.nextTest.proposedHeadline ? (
              <p className="rounded bg-sky-50 px-2 py-1.5 text-sm text-sky-950">
                Propozycja nagłówka (do zatwierdzenia):{" "}
                <strong>{summary.nextTest.proposedHeadline}</strong>
              </p>
            ) : null}
            {summary.nextTest.proposedSeasonalVariant ? (
              <p className="text-sm text-stone-600">
                {summary.nextTest.proposedSeasonalVariant}
              </p>
            ) : null}
            <p className="text-xs text-stone-500">
              Wymaga zatwierdzenia użytkownika ·{" "}
              {summary.nextTest.insufficientEvidence
                ? "brak podstaw do wniosku"
                : "podstawa liczbowa poniżej"}
            </p>
            <pre className="overflow-x-auto rounded bg-stone-50 p-2 text-xs text-stone-700">
              {JSON.stringify(summary.nextTest.numbers, null, 2)}
            </pre>
          </article>
        </div>
      </section>
    </div>
  );
}
