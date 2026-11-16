import { getFoundationStatus } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const status = getFoundationStatus();
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-md border border-amber-200 bg-amber-50 p-8 text-amber-950">
      <h1 className="text-xl font-semibold">Konfiguracja Supabase wymagana</h1>
      <p className="text-sm">
        Panel wymaga projektu Supabase (Postgres + Auth + Storage). Poniżej
        brakujące zmienne w tym środowisku:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {status.missing.length ? (
          status.missing.map((m) => <li key={m}>{m}</li>)
        ) : (
          <li>Brak — sprawdź migracje i użytkownika Auth</li>
        )}
      </ul>
      <p className="text-sm">
        Zobacz <code>docs/local-setup.md</code> oraz{" "}
        <code>docs/deploy-vercel.md</code>. Właściciel podejmuje decyzję o
        płatnym hostingu Vercel.
      </p>
      <p className="text-xs text-amber-800">{status.sqlitePrototypeNote}</p>
      <a className="inline-block text-sm underline" href="/login">
        Przejdź do logowania
      </a>
    </div>
  );
}
