/** Calendar / scheduling helpers for Europe/Stockholm. */

export const STOCKHOLM_TZ = "Europe/Stockholm";

const stockholmFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STOCKHOLM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STOCKHOLM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function partsMap(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Format an instant for display in Europe/Stockholm (`YYYY-MM-DD HH:mm`). */
export function formatStockholm(isoUtc: string | Date): string {
  const date = typeof isoUtc === "string" ? new Date(isoUtc) : isoUtc;
  const formatted = stockholmFormatter.format(date);
  // sv-SE → "2026-11-16 12:07:00"
  return formatted.replace(",", "");
}

/** Calendar day key `YYYY-MM-DD` in Europe/Stockholm. */
export function stockholmDayKey(isoUtc: string | Date): string {
  return formatStockholm(isoUtc).slice(0, 10);
}

/**
 * Parse a Stockholm local datetime (`YYYY-MM-DDTHH:mm` or with seconds)
 * into a UTC ISO string.
 */
export function stockholmLocalToUtcIso(local: string): string {
  const normalized = local.trim().replace(" ", "T");
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!match) {
    throw new Error(`Invalid Stockholm local datetime: ${local}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  // Binary-search UTC ms that formats to the requested Stockholm wall time.
  let lo = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  let hi = Date.UTC(year, month - 1, day + 1, 23, 59, 59);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const p = partsMap(new Date(mid));
    const cmp =
      p.year - year ||
      p.month - month ||
      p.day - day ||
      p.hour - hour ||
      p.minute - minute ||
      p.second - second;
    if (cmp === 0) return new Date(mid).toISOString();
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  throw new Error(`Could not resolve Stockholm local time: ${local}`);
}

export function nowStockholmLabel(): string {
  return `${formatStockholm(new Date())} (${STOCKHOLM_TZ})`;
}

/** Build month grid cells for a Stockholm calendar month. */
export function stockholmMonthGrid(year: number, month1to12: number) {
  const firstUtcGuess = stockholmLocalToUtcIso(
    `${year}-${String(month1to12).padStart(2, "0")}-01T12:00:00`,
  );
  const firstParts = partsMap(new Date(firstUtcGuess));
  // Week starts Monday (Swedish calendars).
  const weekday = new Date(firstUtcGuess).toLocaleDateString("sv-SE", {
    timeZone: STOCKHOLM_TZ,
    weekday: "short",
  });
  const weekdayMap: Record<string, number> = {
    mån: 1,
    tis: 2,
    ons: 3,
    tor: 4,
    fre: 5,
    lör: 6,
    sön: 7,
  };
  const startOffset = (weekdayMap[weekday.toLowerCase()] ?? 1) - 1;
  const daysInMonth = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month1to12).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });
  return { year: firstParts.year, month: month1to12, cells };
}
