"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      const next =
        new URLSearchParams(window.location.search).get("next") ||
        "/publications";
      window.location.href = next;
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Brak NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-md border border-stone-200 bg-white p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
          FönsterFaktor Campaigns
        </p>
        <h1 className="text-xl font-semibold">Logowanie do panelu</h1>
        <p className="mt-2 text-sm text-stone-600">
          Supabase Auth (e-mail + hasło). Konto operatora tworzy się w panelu
          Supabase Authentication.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          E-mail
          <input
            type="email"
            required
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Hasło
          <input
            type="password"
            required
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Logowanie…" : "Zaloguj"}
        </button>
      </form>
      {message ? <p className="text-sm text-amber-800">{message}</p> : null}
    </div>
  );
}
