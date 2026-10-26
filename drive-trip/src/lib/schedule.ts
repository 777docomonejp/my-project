import type { ItineraryItem } from "../types";

export function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 47 || mi > 59) return null; // 翌日の 25:30 のような表記も許可
  return h * 60 + mi;
}

export function stayMinutes(item: Pick<ItineraryItem, "start" | "end">): number | null {
  const s = toMin(item.start);
  const e = toMin(item.end);
  if (s === null || e === null) return null;
  return e >= s ? e - s : e + 24 * 60 - s; // 日付またぎ
}

/** 日付ごとに order → 開始時刻 で並べる */
export function sortItinerary(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort(
    (a, b) => a.date.localeCompare(b.date) || a.order - b.order || (toMin(a.start) ?? 0) - (toMin(b.start) ?? 0),
  );
}

export function groupByDate(items: ItineraryItem[]): [string, ItineraryItem[]][] {
  const map = new Map<string, ItineraryItem[]>();
  for (const it of sortItinerary(items)) {
    const k = it.date || "日付未定";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
  return [...map.entries()];
}

/** 同じ日で時間帯が重なる予定の id ペアを返す */
export function findOverlaps(items: ItineraryItem[]): [string, string][] {
  const out: [string, string][] = [];
  const valid = items
    .map((it) => {
      const s = toMin(it.start);
      const d = stayMinutes(it);
      return s === null || d === null ? null : { it, s, e: s + d };
    })
    .filter((x): x is { it: ItineraryItem; s: number; e: number } => x !== null);
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      if (a.it.date !== b.it.date) continue;
      if (a.s < b.e && b.s < a.e) out.push([a.it.id, b.it.id]);
    }
  }
  return out;
}

/** 同じ日の中で1つ上/下へ移動（order を振り直す） */
export function moveItem(items: ItineraryItem[], id: string, dir: -1 | 1, now: number): ItineraryItem[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  const day = sortItinerary(items.filter((i) => i.date === target.date));
  const idx = day.findIndex((i) => i.id === id);
  const swap = idx + dir;
  if (swap < 0 || swap >= day.length) return items;
  [day[idx], day[swap]] = [day[swap], day[idx]];
  const newOrder = new Map(day.map((it, n) => [it.id, n]));
  return items.map((it) =>
    newOrder.has(it.id) && newOrder.get(it.id) !== it.order ? { ...it, order: newOrder.get(it.id)!, updatedAt: now } : it,
  );
}
