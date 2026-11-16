import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  campaigns,
  conversionEvents,
  links,
  materials,
  publications,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage() {
  const db = getDb();
  const rows = db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .all();

  const eventCounts = db
    .select({
      source: conversionEvents.source,
      eventType: conversionEvents.eventType,
      n: sql<number>`count(*)`,
    })
    .from(conversionEvents)
    .groupBy(conversionEvents.source, conversionEvents.eventType)
    .all();

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Intern kampanjpanel
        </h2>
        <p className="max-w-2xl text-stone-600">
          Skapa, publicera och analysera Drutex-kampanjer i Sverige. DIN Next är
          endast extern trafikdestination. Inga Meta-konton eller betal-API:er
          krävs lokalt.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Kampanjer
        </h3>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white p-6 text-stone-600">
            Ingen data ännu. Kör{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">
              npm run seed:demo
            </code>{" "}
            för exempelkampanjen „Svart skjutparti”.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => {
              const matCount = db
                .select({ n: sql<number>`count(*)` })
                .from(materials)
                .where(eq(materials.campaignId, c.id))
                .get()?.n;
              const pubCount = db
                .select({ n: sql<number>`count(*)` })
                .from(publications)
                .where(eq(publications.campaignId, c.id))
                .get()?.n;
              const link = db
                .select()
                .from(links)
                .where(eq(links.campaignId, c.id))
                .get();

              return (
                <li
                  key={c.id}
                  className="rounded-md border border-stone-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-stone-500">
                        {c.product} · {c.market}
                        {c.region ? ` / ${c.region}` : ""} · status{" "}
                        <span className="font-medium text-stone-700">
                          {c.status}
                        </span>
                        {c.isDemo ? " · demo" : ""}
                      </p>
                    </div>
                    <p className="text-xs text-stone-500">
                      {matCount ?? 0} material · {pubCount ?? 0} publikationer
                    </p>
                  </div>
                  <p className="mt-3 break-all text-sm text-stone-600">
                    Mål:{" "}
                    <a
                      className="underline decoration-stone-300 underline-offset-2"
                      href={c.destinationUrl}
                    >
                      {c.destinationUrl}
                    </a>
                  </p>
                  {link ? (
                    <p className="mt-2 text-sm">
                      Tagglänk:{" "}
                      <a
                        className="font-mono text-xs text-sky-800 underline"
                        href={`/r/${link.id}`}
                      >
                        /r/{link.id}
                      </a>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Resultatkällor (oberoende)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-stone-200 bg-white p-4 text-sm">
            <p className="font-medium">A — Tagglänkar</p>
            <p className="mt-1 text-stone-600">
              Inbound via <code>/r/{"{linkId}"}</code> och{" "}
              <code>POST /api/events/inbound</code>
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white p-4 text-sm">
            <p className="font-medium">B — DIN Next</p>
            <p className="mt-1 text-stone-600">
              Prisvisningar / förfrågningar via{" "}
              <code>POST /api/events/din-next</code>. Simulator:{" "}
              <code>POST /api/simulate/din-next</code> eller{" "}
              <code>npm run simulate:din-next</code>
            </p>
          </div>
        </div>
        {eventCounts.length > 0 ? (
          <ul className="text-sm text-stone-600">
            {eventCounts.map((e) => (
              <li key={`${e.source}-${e.eventType}`}>
                {e.source} / {e.eventType}: {e.n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Inga konverteringshändelser ännu.</p>
        )}
      </section>
    </div>
  );
}
