"use client";

import { useEffect, useState } from "react";
import { formatStockholm } from "@/lib/time/stockholm";
import type {
  ManualPublishPackage,
  Publication,
  PublicationAttempt,
} from "@/lib/types";
import {
  ConfirmationBadge,
  ModeBadge,
  StatusBadge,
} from "./status-badges";

type Props = {
  publication: Publication;
  onChanged: (publication: Publication) => void;
};

export function PublicationDetail({ publication, onChanged }: Props) {
  const [attempts, setAttempts] = useState<PublicationAttempt[]>([]);
  const [pkg, setPkg] = useState<ManualPublishPackage | null>(null);
  const [postUrl, setPostUrl] = useState(publication.postUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/publications/${publication.id}`);
    const data = await res.json();
    if (res.ok) {
      onChanged(data.publication);
      setAttempts(data.attempts ?? []);
    }
    if (publication.publishMode === "manual" || true) {
      const pkgRes = await fetch(
        `/api/publications/${publication.id}/manual-package`,
      );
      const pkgData = await pkgRes.json();
      if (pkgRes.ok) setPkg(pkgData.package);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publication.id]);

  async function send(force?: "success" | "failure" | "ambiguous") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/publications/${publication.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force,
          idempotencyKey: force
            ? `ui-${force}-${publication.id}-${Date.now()}`
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onChanged(data.publication);
      setMessage(
        data.attempt?.outcome
          ? `Wynik próby: ${data.attempt.outcome}${
              data.blockedReason ? ` — ${data.blockedReason}` : ""
            }`
          : "Wysłano",
      );
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reconcile(treatAsMissing?: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/publications/${publication.id}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ treatAsMissing }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconcile failed");
      onChanged(data.publication);
      setMessage(data.message);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveManualUrl(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/publications/${publication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onChanged(data.publication);
      setMessage("Zapisano adres posta i przekazano do analityki");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const canAutoSend =
    publication.publishMode === "test" ||
    publication.publishMode === "connected";

  return (
    <section
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4"
      data-testid="publication-detail"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-stone-900">
          {publication.channel}
        </h3>
        <StatusBadge status={publication.status} />
        <ModeBadge mode={publication.publishMode} />
        <ConfirmationBadge kind={publication.confirmationKind} />
      </div>

      <dl className="grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-stone-800">Termin (Stockholm)</dt>
          <dd>
            {publication.scheduledAt
              ? formatStockholm(publication.scheduledAt)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-800">Link kampanii</dt>
          <dd className="break-all">
            {publication.campaignLinkId
              ? `/r/${publication.campaignLinkId}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-800">Post URL / id</dt>
          <dd className="break-all">
            {publication.postUrl ?? publication.externalId ?? "—"}
          </dd>
        </div>
      </dl>

      {pkg ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-700">
              Pakiet ręczny
            </h4>
            <button
              type="button"
              className="text-xs text-teal-800 underline"
              onClick={() => navigator.clipboard.writeText(pkg.copyText)}
            >
              Kopiuj tekst + link
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-stone-800">
            {pkg.copyText}
          </pre>
          <ul className="mt-2 space-y-1 text-xs text-stone-600">
            {pkg.materials.map((m) => (
              <li key={m.id}>
                <a
                  className="text-teal-800 underline"
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pobierz {m.kind}: {m.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {publication.publishMode === "manual" ? (
        <form onSubmit={saveManualUrl} className="flex flex-wrap gap-2">
          <input
            className="min-w-[240px] flex-1 rounded border border-stone-300 px-2 py-2 text-sm"
            placeholder="https://facebook.com/... adres posta"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-stone-900 px-3 py-2 text-sm text-white"
          >
            Zapisz adres posta
          </button>
        </form>
      ) : null}

      {canAutoSend ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || publication.status === "ambiguous"}
            onClick={() => send(publication.publishMode === "test" ? "success" : undefined)}
            className="rounded bg-teal-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            title={
              publication.status === "ambiguous"
                ? "Najpierw reconcile"
                : "Wyślij (tylko zatwierdzony wariant)"
            }
          >
            Wyślij
          </button>
          {publication.publishMode === "test" ? (
            <>
              <button
                type="button"
                disabled={busy || publication.status === "ambiguous"}
                onClick={() => send("failure")}
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-800 disabled:opacity-50"
              >
                Symuluj błąd
              </button>
              <button
                type="button"
                disabled={busy || publication.status === "ambiguous"}
                onClick={() => send("ambiguous")}
                className="rounded border border-orange-300 px-3 py-2 text-sm text-orange-900 disabled:opacity-50"
              >
                Symuluj niejednoznaczność
              </button>
            </>
          ) : null}
          {publication.status === "ambiguous" ||
          attempts.some((a) => a.outcome === "ambiguous") ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => reconcile(false)}
                className="rounded border border-stone-400 px-3 py-2 text-sm"
              >
                Ustal stan (reconcile)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => reconcile(true)}
                className="rounded border border-stone-400 px-3 py-2 text-sm"
              >
                Reconcile: brak posta → ponów
              </button>
            </>
          ) : null}
          {publication.status === "failed" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => send("success")}
              className="rounded border border-teal-700 px-3 py-2 text-sm text-teal-900"
            >
              Ponów wysyłkę
            </button>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-stone-700" data-testid="pub-message">
          {message}
        </p>
      ) : null}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-700">
          Historia prób
        </h4>
        <ul className="space-y-2" data-testid="attempt-history">
          {attempts.length === 0 ? (
            <li className="text-xs text-stone-500">Brak prób</li>
          ) : (
            attempts.map((a) => (
              <li
                key={a.id}
                className="rounded border border-stone-100 bg-stone-50 px-2 py-2 text-xs text-stone-700"
              >
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={a.outcome} />
                  <span>{a.mode}</span>
                  <span>{formatStockholm(a.startedAt)}</span>
                </div>
                {a.errorMessage ? (
                  <p className="mt-1 text-red-700">{a.errorMessage}</p>
                ) : null}
                {a.platformPostUrl || a.platformPostId ? (
                  <p className="mt-1 break-all">
                    {a.platformPostUrl ?? a.platformPostId}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
