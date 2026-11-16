import type {
  ConfirmationKind,
  PublicationStatus,
  PublishMode,
} from "@/lib/types";

const statusClass: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  scheduled: "bg-sky-100 text-sky-800",
  publishing: "bg-amber-100 text-amber-900",
  published: "bg-emerald-100 text-emerald-800",
  paused: "bg-stone-200 text-stone-700",
  ended: "bg-stone-200 text-stone-600",
  failed: "bg-red-100 text-red-800",
  ambiguous: "bg-orange-100 text-orange-900",
};

const modeLabel: Record<PublishMode, string> = {
  manual: "Ręczna",
  test: "Testowa",
  connected: "Połączona (Meta)",
};

const confirmLabel: Record<ConfirmationKind, string> = {
  manual: "Potwierdzona ręcznie",
  test: "Potwierdzona testowo",
  platform: "Potwierdzona przez platformę",
};

export function StatusBadge({ status }: { status: PublicationStatus | string }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusClass[status] ?? "bg-stone-100"}`}
    >
      {status}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: PublishMode }) {
  return (
    <span className="inline-flex rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs text-teal-900">
      {modeLabel[mode]}
    </span>
  );
}

export function ConfirmationBadge({
  kind,
}: {
  kind: ConfirmationKind | null;
}) {
  if (!kind) {
    return (
      <span className="text-xs text-stone-500">Brak potwierdzenia publikacji</span>
    );
  }
  return (
    <span className="inline-flex rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-800">
      {confirmLabel[kind]}
    </span>
  );
}
