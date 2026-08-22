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
  const now = new Date();
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

export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toDateOnly(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
