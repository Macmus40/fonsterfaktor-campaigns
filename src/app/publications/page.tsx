import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PublicationsIndexPage() {
  const rows = getDb().select().from(campaigns).all();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Publikacje</h1>
        <p className="text-sm text-stone-600">
          Wybierz kampanię, aby otworzyć kalendarz Europe/Stockholm i zaplanować
          wysyłkę na Facebook Page oraz Instagram.
        </p>
      </header>
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-stone-500">
            Brak kampanii. Uruchom <code>npm run seed:demo</code>.
          </li>
        ) : (
          rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-stone-900">{c.name}</p>
                <p className="text-xs text-stone-500">
                  {c.slug} · {c.status}
                  {c.isDemo ? " · demo" : ""}
                </p>
              </div>
              <Link
                href={`/publications/${c.id}`}
                className="rounded bg-teal-800 px-3 py-1.5 text-sm text-white"
              >
                Otwórz kalendarz
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
