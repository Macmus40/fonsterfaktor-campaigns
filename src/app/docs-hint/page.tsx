export default function DocsHintPage() {
  return (
    <div className="prose prose-stone max-w-2xl">
      <h2>Dokumentacja w repo</h2>
      <ul>
        <li>
          <code>docs/campaign-contract.md</code> — modele, Auth, Storage, cron
        </li>
        <li>
          <code>docs/local-setup.md</code> — lokalny Next.js + Supabase
        </li>
        <li>
          <code>docs/deploy-vercel.md</code> — przygotowanie wdrożenia
        </li>
        <li>
          <code>docs/din-next-integration.md</code> — źródło B (bez PII)
        </li>
        <li>
          <code>docs/SQLITE_PROTOTYPE.md</code> — archiwum SQLite
        </li>
        <li>
          <code>supabase/migrations/</code> — Postgres + Storage
        </li>
      </ul>
    </div>
  );
}
