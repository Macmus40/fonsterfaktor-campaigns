import type { CampaignReport } from "@/lib/analytics/report";
import type { FunnelCounters } from "@/lib/types";

export type WeeklySummary = {
  periodLabel: string;
  sampleSizeOk: boolean;
  sampleNotes: string[];
  /** 1) Co się zmieniło */
  whatChanged: {
    headline: string;
    detail: string;
    numbers: Record<string, number>;
  };
  /** 2) Gdzie klienci odpadają */
  dropOff: {
    headline: string;
    detail: string;
    stages: Array<{ from: string; to: string; rate: number | null; lost: number }>;
  };
  /** 3) Jeden test wart uruchomienia */
  nextTest: {
    headline: string;
    recommendation: string;
    proposedHeadline?: string | null;
    proposedSeasonalVariant?: string | null;
    requiresUserApproval: true;
    numbers: Record<string, number>;
    insufficientEvidence: boolean;
  };
};

const MIN_TRANSITIONS = 10;
const MIN_PRICE_VIEWS = 3;

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function pct(n: number | null): string {
  if (n === null) return "n/d";
  return `${Math.round(n * 1000) / 10}%`;
}

function comparePubs(report: CampaignReport) {
  const rows = [...report.byPublication].sort(
    (a, b) => b.funnel.transitions - a.funnel.transitions,
  );
  return rows;
}

function pickContrast(rows: ReturnType<typeof comparePubs>) {
  if (rows.length < 2) return null;
  const byTraffic = [...rows].sort(
    (a, b) => b.funnel.transitions - a.funnel.transitions,
  );
  const highTraffic = byTraffic[0];
  const byInquiries = [...rows].sort(
    (a, b) =>
      b.funnel.inquiries - a.funnel.inquiries ||
      b.funnel.priceViews - a.funnel.priceViews,
  );
  const highConversion = byInquiries[0];
  return { highTraffic, highConversion };
}

export function buildWeeklySummary(
  report: CampaignReport,
  opts?: { periodLabel?: string },
): WeeklySummary {
  const periodLabel =
    opts?.periodLabel ??
    (report.period.from || report.period.to
      ? `${report.period.from ?? "…"} → ${report.period.to ?? "…"}`
      : "bieżący okres");

  const totals = report.totals;
  const sampleNotes: string[] = [];
  let sampleSizeOk = true;

  if (totals.transitions < MIN_TRANSITIONS) {
    sampleSizeOk = false;
    sampleNotes.push(
      `Za mało przejść (${totals.transitions} < ${MIN_TRANSITIONS}) — brak podstaw do wniosku.`,
    );
  }
  if (
    report.conversionMeasurementStatus === "brak_pomiaru_konwersji" ||
    totals.priceViews < MIN_PRICE_VIEWS
  ) {
    if (report.conversionMeasurementStatus === "brak_pomiaru_konwersji") {
      sampleSizeOk = false;
      sampleNotes.push("brak pomiaru konwersji — DIN Next nie podłączony / brak zdarzeń.");
    } else if (totals.priceViews < MIN_PRICE_VIEWS) {
      sampleSizeOk = false;
      sampleNotes.push(
        `Za mało wyświetleń ceny (${totals.priceViews} < ${MIN_PRICE_VIEWS}).`,
      );
    }
  }

  const pubs = comparePubs(report);
  const contrast = pickContrast(pubs);

  let whatChanged: WeeklySummary["whatChanged"];
  if (contrast && contrast.highTraffic.publicationId !== contrast.highConversion.publicationId) {
    const a = contrast.highTraffic;
    const b = contrast.highConversion;
    const aLabel = a.contentVariantLabel
      ? `zdjęcie/wariant ${a.contentVariantLabel}`
      : a.channel;
    const bLabel = b.contentVariantLabel
      ? `zdjęcie/wariant ${b.contentVariantLabel}`
      : b.channel;
    whatChanged = {
      headline: `${aLabel} zebrało więcej przejść, a ${bLabel} więcej wycen i zgłoszeń`,
      detail: `Ruch nie równa się konwersji: ${aLabel} → ${a.funnel.transitions} przejść / ${a.funnel.priceViews} wycen / ${a.funnel.inquiries} zapytań; ${bLabel} → ${b.funnel.transitions} przejść / ${b.funnel.priceViews} wycen / ${b.funnel.inquiries} zapytań. Przejścia to przekierowania, nie unikalni klienci.`,
      numbers: {
        highTrafficTransitions: a.funnel.transitions,
        highTrafficPriceViews: a.funnel.priceViews,
        highTrafficInquiries: a.funnel.inquiries,
        highConversionTransitions: b.funnel.transitions,
        highConversionPriceViews: b.funnel.priceViews,
        highConversionInquiries: b.funnel.inquiries,
      },
    };
  } else if (pubs[0]) {
    const top = pubs[0];
    const label = top.contentVariantLabel ?? top.channel;
    whatChanged = {
      headline: `Dominuje publikacja ${label}`,
      detail: `${top.funnel.transitions} przejść, ${top.funnel.priceViews} wycen, ${top.funnel.inquiries} zapytań (kanał ${top.channel}).`,
      numbers: {
        transitions: top.funnel.transitions,
        priceViews: top.funnel.priceViews,
        inquiries: top.funnel.inquiries,
      },
    };
  } else {
    whatChanged = {
      headline: "Brak publikacji w okresie",
      detail: "Dodaj publikacje z osobnymi linkami, aby porównać wyniki.",
      numbers: {},
    };
  }

  const stages = [
    {
      from: "zasięg platformy",
      to: "przejścia",
      rate: rate(totals.transitions, totals.platformReach),
      lost: Math.max(0, totals.platformReach - totals.transitions),
    },
    {
      from: "przejścia",
      to: "wyświetlenia ceny",
      rate: rate(totals.priceViews, totals.transitions),
      lost: Math.max(0, totals.transitions - totals.priceViews),
    },
    {
      from: "wyświetlenia ceny",
      to: "zapytania",
      rate: rate(totals.inquiries, totals.priceViews),
      lost: Math.max(0, totals.priceViews - totals.inquiries),
    },
  ];

  const weakest = [...stages]
    .filter((s) => s.rate !== null)
    .sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))[0];

  const dropOff: WeeklySummary["dropOff"] = {
    headline: weakest
      ? `Największy spadek: ${weakest.from} → ${weakest.to} (${pct(weakest.rate)})`
      : "Za mało danych, by wskazać spadek w lejku",
    detail: weakest
      ? `Na etapie „${weakest.from} → ${weakest.to}” odpada ${weakest.lost} (współczynnik ${pct(weakest.rate)}).`
      : sampleNotes.join(" ") || "Uzupełnij zdarzenia i statystyki platformy.",
    stages,
  };

  let nextTest: WeeklySummary["nextTest"];
  if (!sampleSizeOk) {
    nextTest = {
      headline: "Brak podstaw do wniosku — zbierz większą próbę",
      recommendation:
        "Nie zmieniaj kreatywów na podstawie tych liczb. Domknij pomiar konwersji (DIN Next) i zbierz więcej przejść/wycen przed testem A/B.",
      proposedHeadline: null,
      proposedSeasonalVariant: null,
      requiresUserApproval: true,
      numbers: {
        transitions: totals.transitions,
        priceViews: totals.priceViews,
        inquiries: totals.inquiries,
      },
      insufficientEvidence: true,
    };
  } else if (contrast && contrast.highTraffic.publicationId !== contrast.highConversion.publicationId) {
    const winner = contrast.highConversion;
    const loser = contrast.highTraffic;
    const season =
      new Date().getMonth() >= 10 || new Date().getMonth() <= 1
        ? "vinterljus"
        : "vårsol";
    nextTest = {
      headline: `Przenieś przekaz zwycięskiego wariantu ${winner.contentVariantLabel ?? ""} na ruch wariantu ${loser.contentVariantLabel ?? ""}`,
      recommendation: `Uruchom test: ten sam ruch co przy ${loser.contentVariantLabel ?? loser.channel}, ale nagłówek/CTA bliżej ${winner.contentVariantLabel ?? winner.channel} (więcej wycen/zapytań).`,
      proposedHeadline:
        winner.contentVariantHeadline ??
        "Se ditt pris på svart skjutparti – konfigurera online",
      proposedSeasonalVariant: `Säsongsvariant (${season}): behåll produktparametrar, byt öppning till säsongston.`,
      requiresUserApproval: true,
      numbers: {
        winnerInquiries: winner.funnel.inquiries,
        winnerPriceViews: winner.funnel.priceViews,
        loserTransitions: loser.funnel.transitions,
        loserInquiries: loser.funnel.inquiries,
      },
      insufficientEvidence: false,
    };
  } else {
    nextTest = {
      headline: "Przetestuj nowy nagłówek na najmocniejszym kanale",
      recommendation:
        "Przy podobnej konwersji między publikacjami zaproponuj nowy nagłówek z naciskiem na cenę we własnym wymiarze — wymaga zatwierdzenia.",
      proposedHeadline: "Beräkna priset på ditt mått – svart skjutparti",
      proposedSeasonalVariant: null,
      requiresUserApproval: true,
      numbers: {
        transitions: totals.transitions,
        inquiries: totals.inquiries,
      },
      insufficientEvidence: false,
    };
  }

  return {
    periodLabel,
    sampleSizeOk,
    sampleNotes,
    whatChanged,
    dropOff,
    nextTest,
  };
}

export function funnelToPlain(f: FunnelCounters) {
  return { ...f };
}
