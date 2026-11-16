/**
 * Local DIN Next event simulator — posts sample price_view / inquiry_submitted
 * into this app. Does not touch the DIN Next / konfigurator repository.
 *
 * Usage:
 *   npm run simulate:din-next
 *   npm run simulate:din-next -- --base http://localhost:3000 --slug svart-skjutparti
 */
const args = process.argv.slice(2);

function flag(name: string, fallback: string) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const base = flag("base", "http://localhost:3000").replace(/\/$/, "");
const slug = flag("slug", "svart-skjutparti");

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  console.log(path, res.status, json);
  if (!res.ok) process.exitCode = 1;
}

async function main() {
  const stamp = Date.now();
  await post("/api/simulate/din-next", {
    campaignSlug: slug,
    count: 2,
    includeInquiry: true,
    seed: stamp,
  });

  // Also demonstrate direct ingest (same contract DIN Next would use later)
  await post("/api/events/din-next", {
    eventType: "price_view",
    campaignSlug: slug,
    occurredAt: new Date().toISOString(),
    idempotencyKey: `cli-sim:price_view:${stamp}`,
    payload: {
      product: "Svart skjutparti",
      configuratorUrl: `https://example.test/konfigurator?campaign=${slug}`,
      priceSek: 42900,
      simulator: true,
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
