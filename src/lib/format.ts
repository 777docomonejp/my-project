export function formatDateJP(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

/** e.g. "生後3ヶ月" / "2歳1ヶ月" */
export function formatAge(birthDate: Date | string | null): string | null {
  if (!birthDate) return null;
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = todayDateOnly();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years === 0) return `生後${remMonths}ヶ月`;
  if (remMonths === 0) return `${years}歳`;
  return `${years}歳${remMonths}ヶ月`;
}

// The server (Vercel) always runs in UTC regardless of where the family actually is,
// so "today" must be computed in the app's timezone rather than the server's local time —
// otherwise the day boundary (and the care checklist reset) lags by up to 9 hours in Japan.
const APP_TIME_ZONE = "Asia/Tokyo";

/** "Today" as a UTC-midnight Date representing the calendar day in APP_TIME_ZONE. */
export function todayDateOnly(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateOnly(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** クコの実 is only offered on Monday / Wednesday / Friday. `dateStr` is "yyyy-mm-dd". */
export function isGojiBerryDay(dateStr: string): boolean {
  const day = new Date(dateStr).getUTCDay(); // 0=Sun ... 6=Sat, timezone-independent for a date-only string
  return day === 1 || day === 3 || day === 5;
}
