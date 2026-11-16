/**
 * Build the final konfigurator URL while preserving product-opening params
 * already present on the link destination, then layer campaign attribution.
 */

const PRODUCT_PARAM_KEYS = [
  "product",
  "finish",
  "campaign",
  "profile",
  "glazing",
  "width",
  "height",
  "sku",
  "variant",
  "config",
  "mode",
] as const;

export function buildRedirectDestination(opts: {
  destinationUrl: string;
  linkId: string;
  publicationId?: string | null;
  contentVariantLabel?: string | null;
  utm: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
  extraQuery?: Record<string, string | null | undefined>;
}): string {
  const dest = new URL(opts.destinationUrl);

  // Preserve existing product/opening params (do not overwrite if already set)
  const preserved: Record<string, string> = {};
  for (const key of PRODUCT_PARAM_KEYS) {
    const v = dest.searchParams.get(key);
    if (v) preserved[key] = v;
  }

  for (const [k, v] of Object.entries(opts.utm)) {
    if (v) dest.searchParams.set(k, v);
  }

  for (const [k, v] of Object.entries(preserved)) {
    dest.searchParams.set(k, v);
  }

  if (opts.extraQuery) {
    for (const [k, v] of Object.entries(opts.extraQuery)) {
      if (v) dest.searchParams.set(k, v);
    }
  }

  dest.searchParams.set("ff_link_id", opts.linkId);
  if (opts.publicationId) {
    dest.searchParams.set("ff_publication_id", opts.publicationId);
  }
  if (opts.contentVariantLabel) {
    dest.searchParams.set("ff_variant", opts.contentVariantLabel);
  }

  return dest.toString();
}

export { PRODUCT_PARAM_KEYS };
