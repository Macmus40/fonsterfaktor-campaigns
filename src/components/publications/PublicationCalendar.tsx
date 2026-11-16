"use client";

import {
  STOCKHOLM_TZ,
  formatStockholm,
  stockholmDayKey,
  stockholmMonthGrid,
} from "@/lib/time/stockholm";
import type { Publication } from "@/lib/types";
import { StatusBadge } from "./status-badges";

type Props = {
  publications: Publication[];
  year: number;
  month: number;
  onSelectDay?: (dayKey: string) => void;
  selectedDay?: string | null;
};

export function PublicationCalendar({
  publications,
  year,
  month,
  onSelectDay,
  selectedDay,
}: Props) {
  const { cells } = stockholmMonthGrid(year, month);
  const byDay = new Map<string, Publication[]>();
  for (const pub of publications) {
    if (!pub.scheduledAt) continue;
    const key = stockholmDayKey(pub.scheduledAt);
    const list = byDay.get(key) ?? [];
    list.push(pub);
    byDay.set(key, list);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(
    "sv-SE",
    { month: "long", year: "numeric", timeZone: STOCKHOLM_TZ },
  );

  return (
    <section
      aria-label={`Kalender ${monthLabel} (${STOCKHOLM_TZ})`}
      className="overflow-hidden rounded-xl border border-stone-200 bg-white/90 shadow-sm"
      data-testid="publication-calendar"
    >
      <div className="flex items-baseline justify-between border-b border-stone-200 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold capitalize text-stone-900">
            {monthLabel}
          </h2>
          <p className="text-xs text-stone-500">
            Strefa czasowa: {STOCKHOLM_TZ}
          </p>
        </div>
        <p className="text-xs text-stone-500">
          {publications.filter((p) => p.scheduledAt).length} zaplanowanych
        </p>
      </div>
      <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50 text-center text-[11px] uppercase tracking-wide text-stone-500">
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const items = cell.key ? (byDay.get(cell.key) ?? []) : [];
          const selected = cell.key && selectedDay === cell.key;
          return (
            <button
              key={`${cell.key ?? "empty"}-${idx}`}
              type="button"
              disabled={!cell.day}
              onClick={() => cell.key && onSelectDay?.(cell.key)}
              className={`min-h-[88px] border-b border-r border-stone-100 p-2 text-left transition ${
                cell.day ? "hover:bg-teal-50/60" : "bg-stone-50/40"
              } ${selected ? "bg-teal-50 ring-1 ring-inset ring-teal-300" : ""}`}
            >
              {cell.day ? (
                <>
                  <div className="text-xs font-medium text-stone-700">
                    {cell.day}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {items.slice(0, 3).map((p) => (
                      <li
                        key={p.id}
                        className="truncate rounded bg-stone-100 px-1 py-0.5 text-[10px] text-stone-700"
                        title={`${p.channel} · ${formatStockholm(p.scheduledAt!)}`}
                      >
                        <span className="font-medium">{p.channel}</span>{" "}
                        <StatusBadge status={p.status} />
                      </li>
                    ))}
                    {items.length > 3 ? (
                      <li className="text-[10px] text-stone-500">
                        +{items.length - 3}
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
