import type { Collection, Rec, Trip } from "../types";
import { COLLECTIONS } from "../types";

export function newId(): string {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

/** 初期データ。日付以外は「仮」の値で、すべて画面から編集できる。 */
export function createDefaultTrip(now = Date.now()): Trip {
  const m = [newId(), newId(), newId()];
  const r = <T extends object>(extra: T) => ({ id: newId(), updatedAt: now, ...extra });
  return {
    schema: 1,
    tripId: newId(),
    meta: {
      id: "meta",
      updatedAt: now,
      title: "関東ドライブ旅行",
      departure: "2026-12-25（金）深夜",
      startDate: "2026-12-25",
      endDate: "",
      origin: "大阪府豊中市",
      meetPoint: "埼玉県戸田市",
      baseName: "しょーいちの家（戸田）",
      car: "友人の普通車（ETCあり）",
      notes: "帰りの日程・観光日程は未定。決まったら編集してください。",
    },
    members: [
      { id: m[0], updatedAt: now, name: "メンバー1（運転）" },
      { id: m[1], updatedAt: now, name: "メンバー2" },
      { id: m[2], updatedAt: now, name: "メンバー3（戸田で合流）" },
    ],
    hotels: [
      r({ chain: "アパホテル", name: "（ホテル名未定）", address: "", checkIn: "", checkOut: "", status: "未確認" as const, price: 0, priceConfirmed: false, url: "", notes: "" }),
      r({ chain: "ルートイン", name: "（ホテル名未定）", address: "", checkIn: "", checkOut: "", status: "未確認" as const, price: 0, priceConfirmed: false, url: "", notes: "" }),
    ],
    spotStates: [],
    customSpots: [],
    itinerary: [
      r({ date: "2026-12-25", start: "23:00", end: "23:30", title: "豊中市を出発（例）", travelMin: 0, order: 0, rainAlt: "", notes: "出発時刻は仮。編集してください" }),
      r({ date: "2026-12-26", start: "06:30", end: "07:30", title: "戸田市で合流（例）", travelMin: 420, order: 0, rainAlt: "", notes: "移動時間は休憩込みの目安。道路状況で大きく変わります" }),
    ],
    costs: [
      r({ category: "fuel" as const, leg: "outbound" as const, label: "往路ガソリン（豊中→戸田）", amount: 0, distanceKm: 520, kmPerL: 15, yenPerL: 170, confirmed: false, payerId: m[0], splitAmong: [], note: "距離・燃費・単価は仮の概算値。実際の値に修正してください" }),
      r({ category: "toll" as const, leg: "outbound" as const, label: "往路 高速料金（ETC）", amount: 0, confirmed: false, payerId: m[0], splitAmong: [], note: "未入力。NEXCO「ドラぷら」等で検索して入力" }),
      r({ category: "fuel" as const, leg: "return" as const, label: "復路ガソリン", amount: 0, distanceKm: 520, kmPerL: 15, yenPerL: 170, confirmed: false, payerId: m[0], splitAmong: [], note: "仮の概算値" }),
    ],
    messages: [],
    votes: [],
    tombstones: [],
  };
}

/** 読み込んだJSONが Trip として使えるか検査し、欠けた配列を補う。壊れていれば null。 */
export function normalizeTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<Trip>;
  if (t.schema !== 1 || typeof t.tripId !== "string" || !t.meta || typeof t.meta !== "object") return null;
  const out = { ...t } as Trip;
  for (const c of COLLECTIONS) {
    const arr = (t as Record<string, unknown>)[c];
    out[c] = (Array.isArray(arr) ? arr.filter(isRec) : []) as never;
  }
  out.tombstones = Array.isArray(t.tombstones) ? t.tombstones.filter((x) => x && typeof x.id === "string") : [];
  return out;
}

function isRec(x: unknown): x is Rec {
  return !!x && typeof x === "object" && typeof (x as Rec).id === "string" && typeof (x as Rec).updatedAt === "number";
}

// ---- 編集操作（いずれも新しい Trip を返す） ----

export function upsert<C extends Collection>(trip: Trip, c: C, rec: Trip[C][number], now = Date.now()): Trip {
  const list = trip[c] as Rec[];
  const next = { ...rec, updatedAt: now } as Rec;
  const exists = list.some((r) => r.id === rec.id);
  return { ...trip, [c]: exists ? list.map((r) => (r.id === rec.id ? next : r)) : [...list, next] };
}

export function remove(trip: Trip, c: Collection, id: string, now = Date.now()): Trip {
  const list = trip[c] as Rec[];
  return {
    ...trip,
    [c]: list.filter((r) => r.id !== id),
    tombstones: [...trip.tombstones.filter((t) => t.id !== `${c}:${id}`), { id: `${c}:${id}`, deletedAt: now }],
  };
}

/**
 * 2つの旅行データを統合する（共有コードの取り込み用）。
 * レコード単位で updatedAt が新しい方を採用し、削除記録（tombstone）より古いレコードは消す。
 * 同じ入力なら順序に関係なく同じ結果になる。
 */
export function mergeTrips(a: Trip, b: Trip): Trip {
  const tomb = new Map<string, number>();
  for (const t of [...a.tombstones, ...b.tombstones]) tomb.set(t.id, Math.max(tomb.get(t.id) ?? 0, t.deletedAt));

  const out: Trip = {
    ...a,
    meta: b.meta.updatedAt > a.meta.updatedAt ? b.meta : a.meta,
    tombstones: [...tomb.entries()].map(([id, deletedAt]) => ({ id, deletedAt })).sort((x, y) => x.id.localeCompare(y.id)),
  };
  for (const c of COLLECTIONS) {
    const map = new Map<string, Rec>();
    for (const r of [...(a[c] as Rec[]), ...(b[c] as Rec[])]) {
      const cur = map.get(r.id);
      if (!cur || r.updatedAt > cur.updatedAt || (r.updatedAt === cur.updatedAt && JSON.stringify(r) > JSON.stringify(cur))) {
        map.set(r.id, r);
      }
    }
    const kept = [...map.values()].filter((r) => {
      const d = tomb.get(`${c}:${r.id}`);
      return d === undefined || r.updatedAt > d;
    });
    kept.sort((x, y) => x.id.localeCompare(y.id));
    (out as unknown as Record<string, Rec[]>)[c] = kept;
  }
  return out;
}

// ---- 保存 ----

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const KEY = "drive-trip:v1";
const BACKUP_KEY = "drive-trip:v1:backup";

export function safeStorage(): KV | null {
  try {
    const s = globalThis.localStorage;
    const probe = "__probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export type LoadResult = { trip: Trip; source: "saved" | "backup" | "default"; error?: string };

export function loadTrip(kv: KV | null): LoadResult {
  if (!kv) return { trip: createDefaultTrip(), source: "default", error: "この端末ではブラウザ保存が使えません（プライベートモード等）。閉じるとデータが消えるため、こまめにバックアップしてください。" };
  for (const [key, source] of [[KEY, "saved"], [BACKUP_KEY, "backup"]] as const) {
    try {
      const s = kv.getItem(key);
      if (!s) continue;
      const t = normalizeTrip(JSON.parse(s));
      if (t) return { trip: t, source, error: source === "backup" ? "保存データが壊れていたため、1つ前の自動バックアップから復元しました。" : undefined };
    } catch {
      /* 次の候補へ */
    }
  }
  return { trip: createDefaultTrip(), source: "default" };
}

/** 保存。直前の正常データを自動バックアップとして1世代残す。 */
export function saveTrip(kv: KV | null, trip: Trip): string | null {
  if (!kv) return "保存できません";
  try {
    const prev = kv.getItem(KEY);
    if (prev) kv.setItem(BACKUP_KEY, prev);
    kv.setItem(KEY, JSON.stringify(trip));
    return null;
  } catch (e) {
    return e instanceof Error && /quota/i.test(e.name + e.message) ? "保存容量が不足しています" : "保存に失敗しました";
  }
}

export function clearTrip(kv: KV | null) {
  try {
    kv?.removeItem(KEY);
  } catch {
    /* 無視 */
  }
}

/** 初期データから一度も編集されていないか（編集すると updatedAt が変わる） */
export function isPristine(t: Trip): boolean {
  if (t.tombstones.length) return false;
  if (t.messages.length || t.votes.length || t.spotStates.length || t.customSpots.length) return false;
  const created = t.meta.updatedAt;
  return COLLECTIONS.every((c) => (t[c] as Rec[]).every((r) => r.updatedAt === created));
}

export type CloudDecision = "push" | "adopt" | "merge" | "conflict" | "same";

/**
 * 端末のデータとクラウドのデータの扱いを決める。どちらかの入力済みデータを黙って捨てることはしない。
 * - クラウドが空：端末のデータを保存（push）
 * - 同じ旅行：レコード単位で統合（merge）
 * - 端末が未編集の初期データ：クラウドを採用（adopt）
 * - 別の旅行で両方とも入力済み：利用者に選んでもらう（conflict）
 */
export function decideCloud(local: Trip, cloud: Trip | null): CloudDecision {
  if (!cloud) return "push";
  if (local.tripId === cloud.tripId) return JSON.stringify(mergeTrips(local, cloud)) === JSON.stringify(mergeTrips(local, local)) ? "same" : "merge";
  if (isPristine(local)) return "adopt";
  if (isPristine(cloud)) return "push";
  return "conflict";
}

const STASH_KEY = "drive-trip:v1:stash";

/** 置き換えられる前のデータを端末内に退避する（復元はバックアップ画面から） */
export function stashTrip(kv: KV | null, trip: Trip) {
  try {
    kv?.setItem(STASH_KEY, JSON.stringify(trip));
  } catch {
    /* 退避できなくても続行 */
  }
}

export function readStash(kv: KV | null): Trip | null {
  try {
    const s = kv?.getItem(STASH_KEY);
    return s ? normalizeTrip(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}
