/** Local Swedish copy templates + tag fillers. No paid API. */

import type {
  CampaignContext,
  ContentAngle,
  ExtendedContent,
  GenerationSource,
  MaterialKind,
} from "@/lib/types";

export type GenerateInput = {
  product: string;
  goal: string;
  region?: string | null;
  destinationUrl: string;
  materialKind: MaterialKind;
  materialTitle: string;
  userDescription?: string | null;
  sceneNotes?: string | null;
  context?: CampaignContext;
  preferLocalModel?: boolean;
};

export type GeneratedProposal = {
  label: string;
  angle: ContentAngle;
  channelHint: string;
  headline: string;
  body: string;
  cta: string | null;
  generationSource: GenerationSource;
  extended: ExtendedContent;
  missingFields: string[];
};

function clean(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function featureList(ctx?: CampaignContext): string {
  const feats = (ctx?.productFeatures ?? []).map((f) => f.trim()).filter(Boolean);
  if (feats.length === 0) return "";
  if (feats.length === 1) return feats[0];
  return `${feats.slice(0, -1).join(", ")} och ${feats[feats.length - 1]}`;
}

function collectMissing(ctx?: CampaignContext): string[] {
  const missing: string[] = [];
  if (!ctx?.priceText?.trim()) missing.push("pris");
  if (!ctx?.deadlineText?.trim()) missing.push("tidsfrist");
  if (!(ctx?.productFeatures ?? []).some((f) => f.trim())) {
    missing.push("produktparametrar");
  }
  return missing;
}

function seasonPhrase(ctx?: CampaignContext): string {
  const bits = [
    ctx?.season ? `inför ${ctx.season}` : null,
    ctx?.holiday ? `till ${ctx.holiday}` : null,
    ctx?.weather ? `när det är ${ctx.weather}` : null,
  ];
  return clean(bits);
}

function regionPhrase(region?: string | null): string {
  if (!region?.trim()) return "i Sverige";
  return `i ${region.trim()}`;
}

function ctaText(ctx?: CampaignContext, destinationUrl?: string): string {
  const url = ctx?.configuratorCtaUrl?.trim() || destinationUrl || "";
  if (url) return "Öppna konfiguratorn och se ditt pris";
  return "Kontakta oss för offert";
}

function buildImagePrice(input: GenerateInput, missing: string[]): ExtendedContent {
  const feats = featureList(input.context);
  const price = input.context?.priceText?.trim();
  const deadline = input.context?.deadlineText?.trim();
  const desc = input.userDescription?.trim();

  const headline = clean([
    input.product,
    price ? `– från ${price}` : "i eget mått",
  ]);

  const postText = clean([
    desc
      ? (desc.endsWith(".") ? desc : `${desc}.`)
      : `${input.product} anpassas efter ditt mått.`,
    feats ? `Med ${feats}.` : null,
    price ? `Prisexempel: ${price}.` : null,
    deadline ? `Gäller till ${deadline}.` : null,
    `Konfigurera ${regionPhrase(input.region)} och skicka förfrågan.`,
  ]);

  const carouselCaptions = [
    clean([input.product, "i eget mått"]),
    feats ? clean(["Fakta:", feats]) : "Välj glas, färg och tillval",
    price
      ? `Prisexempel ${price}`
      : "Se pris direkt i konfiguratorn",
    deadline ? `Erbjudande till ${deadline}` : "Skicka förfrågan online",
  ];

  return {
    kind: "image",
    headline,
    postText,
    carouselCaptions,
    cta: ctaText(input.context, input.destinationUrl),
  };
}

function buildImageSeason(input: GenerateInput, _missing: string[]): ExtendedContent {
  const season = seasonPhrase(input.context) || "när säsongen förändras";
  const feats = featureList(input.context);
  const desc = input.userDescription?.trim();
  const weather = input.context?.weather?.trim();

  const problem = weather
    ? `När det är ${weather} märks drag och energiförlust snabbare.`
    : "Gamla partier läcker värme och ger mindre ljus.";

  const headline = clean([
    season.charAt(0).toUpperCase() + season.slice(1),
    "– byt till",
    input.product,
  ]);

  const postText = clean([
    problem,
    desc ? (desc.endsWith(".") ? desc : `${desc}.`) : null,
    feats ? `${input.product} med ${feats}.` : `${input.product} ger mer ljus och bättre isolering.`,
    `Planera bytet ${regionPhrase(input.region)}.`,
  ]);

  const carouselCaptions = [
    clean(["Problem:", weather ? weather : "kyla & energiläckage"]),
    clean(["Lösning:", input.product]),
    feats || "Eget mått & modern finish",
    season || "Rätt tid att byta",
  ];

  return {
    kind: "image",
    headline,
    postText,
    carouselCaptions,
    cta: ctaText(input.context, input.destinationUrl),
  };
}

function buildVideoPrice(input: GenerateInput, _missing: string[]): ExtendedContent {
  const feats = featureList(input.context);
  const price = input.context?.priceText?.trim();
  const scenes = input.sceneNotes?.trim();
  const desc = input.userDescription?.trim();

  const opening = clean([
    "Öppning:",
    input.product,
    price ? `– från ${price}` : "i eget mått",
  ]);

  const overlaySequence = [
    input.product,
    feats || "Eget mått · glas · tillval",
    price ? `Prisexempel ${price}` : "Se pris i konfiguratorn",
    "Konfigurera nu",
  ];

  const narration = clean([
    scenes
      ? `Scener: ${scenes}.`
      : `Visa fasaden, öppningen och detaljen i ${input.product}.`,
    desc ? `Berättarröst: ${desc}.` : null,
    feats ? `Nämn ${feats}.` : null,
    price
      ? `Avsluta med prisexempel ${price} och CTA till konfiguratorn.`
      : "Avsluta med CTA till konfiguratorn – nämn inte pris om det saknas.",
  ]);

  const publicationDescription = clean([
    `Kort film om ${input.product}`,
    price ? `med prisexempel ${price}` : "i eget mått",
    regionPhrase(input.region) + ".",
    "Länk till konfiguratorn i caption.",
  ]);

  return {
    kind: "video",
    opening,
    overlaySequence,
    narration,
    publicationDescription,
  };
}

function buildVideoSeason(input: GenerateInput, _missing: string[]): ExtendedContent {
  const season = seasonPhrase(input.context) || "inför säsongsskiftet";
  const weather = input.context?.weather?.trim();
  const feats = featureList(input.context);
  const scenes = input.sceneNotes?.trim();
  const desc = input.userDescription?.trim();

  const opening = clean([
    "Öppning:",
    weather ? `${weather.charAt(0).toUpperCase() + weather.slice(1)} ute` : "Kyla ute",
    "– ljus och värme inne med",
    input.product,
  ]);

  const overlaySequence = [
    weather ? `När det är ${weather}` : "När säsongen vänder",
    "Gamla partier läcker",
    clean([input.product, feats ? `· ${feats}` : null]),
    clean([season, "– konfigurera nu"]),
  ];

  const narration = clean([
    scenes ? `Följ scenerna: ${scenes}.` : "Börja med väder/utsida, klipp till öppning och interiörljus.",
    desc ? `Beskrivning: ${desc}.` : null,
    `Berätta om problemet ${regionPhrase(input.region)} och hur ${input.product} löser det.`,
    feats ? `Lyft ${feats}.` : null,
    "Avsluta med soft CTA till konfiguratorn.",
  ]);

  const publicationDescription = clean([
    `Säsongsfilm ${season} för ${input.product}`,
    regionPhrase(input.region) + ".",
    "Fokus på kundproblem och lösning, inte pris.",
  ]);

  return {
    kind: "video",
    opening,
    overlaySequence,
    narration,
    publicationDescription,
  };
}

function flatten(extended: ExtendedContent, ctaFallback: string): {
  headline: string;
  body: string;
  cta: string;
} {
  if (extended.kind === "image") {
    return {
      headline: extended.headline,
      body: extended.postText,
      cta: extended.cta || ctaFallback,
    };
  }
  return {
    headline: extended.opening,
    body: [
      extended.narration,
      "",
      "Textsekvens:",
      ...extended.overlaySequence.map((t, i) => `${i + 1}. ${t}`),
      "",
      extended.publicationDescription,
    ].join("\n"),
    cta: ctaFallback,
  };
}

/**
 * Optional local model (Ollama-compatible). Never calls paid cloud APIs.
 * Set LOCAL_LLM_URL e.g. http://127.0.0.1:11434/api/generate and LOCAL_LLM_MODEL.
 */
export async function tryLocalModelPolish(
  draft: GeneratedProposal,
  input: GenerateInput,
): Promise<GeneratedProposal | null> {
  const base = process.env.LOCAL_LLM_URL?.trim();
  if (!base) return null;

  const model = process.env.LOCAL_LLM_MODEL?.trim() || "llama3.2";
  const prompt = [
    "Du är en svensk copywriter för fönster/skjutpartier. Förbättra ENDAST formuleringarna.",
    "Hitta inte på pris, deadline eller tekniska data som saknas.",
    `Produkt: ${input.product}`,
    `Vinkel: ${draft.angle}`,
    `Utkast JSON: ${JSON.stringify(draft.extended)}`,
    "Svara med samma JSON-struktur, inget annat.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    if (!data.response) return null;
    const extended = JSON.parse(data.response) as ExtendedContent;
    if (!extended || (extended.kind !== "image" && extended.kind !== "video")) {
      return null;
    }
    const flat = flatten(extended, draft.cta || ctaText(input.context, input.destinationUrl));
    return {
      ...draft,
      ...flat,
      extended,
      generationSource: "local_model",
    };
  } catch {
    return null;
  }
}

export function generateTemplateProposals(
  input: GenerateInput,
): GeneratedProposal[] {
  const missing = collectMissing(input.context);
  const cta = ctaText(input.context, input.destinationUrl);
  const hasDesc = Boolean(input.userDescription?.trim() || input.sceneNotes?.trim());
  const baseSource: GenerationSource = hasDesc
    ? "user_description"
    : "template";

  // Heuristic: if no user description, mark as material_analysis when a local
  // analysis tag is requested via env; otherwise keep template provenance.
  const analysisConfigured = process.env.LOCAL_MATERIAL_ANALYSIS === "1";
  const source: GenerationSource =
    !hasDesc && analysisConfigured ? "material_analysis" : baseSource;

  const priceExtended =
    input.materialKind === "image"
      ? buildImagePrice(input, missing)
      : buildVideoPrice(input, missing);
  const seasonExtended =
    input.materialKind === "image"
      ? buildImageSeason(input, missing)
      : buildVideoSeason(input, missing);

  const priceFlat = flatten(priceExtended, cta);
  const seasonFlat = flatten(seasonExtended, cta);

  return [
    {
      label: "A",
      angle: "price_custom",
      channelHint: "meta",
      ...priceFlat,
      generationSource: source,
      extended: priceExtended,
      missingFields: missing,
    },
    {
      label: "B",
      angle: "season_problem",
      channelHint: "organic",
      ...seasonFlat,
      generationSource: source,
      extended: seasonExtended,
      missingFields: missing.filter((m) => m !== "pris"),
    },
  ];
}

export async function generateProposals(
  input: GenerateInput,
): Promise<GeneratedProposal[]> {
  const proposals = generateTemplateProposals(input);
  if (!input.preferLocalModel) return proposals;

  const polished: GeneratedProposal[] = [];
  for (const p of proposals) {
    const improved = await tryLocalModelPolish(p, input);
    polished.push(improved ?? p);
  }
  return polished;
}

export {
  angleLabel,
  generationSourceLabel,
} from "@/lib/campaigns/labels";
