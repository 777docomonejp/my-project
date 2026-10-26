import { describe, expect, it } from "vitest";
import { clearTrip, createDefaultTrip, loadTrip, mergeTrips, normalizeTrip, remove, saveTrip, upsert, type KV } from "../src/lib/trip";
import spots from "../src/data/spots.json";
import { PREFS, GENRES } from "../src/types";

function memKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("保存と読み込み", () => {
  it("保存したデータを読み込める", () => {
    const kv = memKV();
    const t = createDefaultTrip(1);
    expect(saveTrip(kv, t)).toBeNull();
    const r = loadTrip(kv);
    expect(r.source).toBe("saved");
    expect(r.trip).toEqual(t);
  });
  it("壊れたデータは自動バックアップから復元", () => {
    const kv = memKV();
    const t1 = createDefaultTrip(1);
    saveTrip(kv, t1);
    saveTrip(kv, { ...t1, meta: { ...t1.meta, title: "新" } });
    kv.setItem("drive-trip:v1", "{broken");
    const r = loadTrip(kv);
    expect(r.source).toBe("backup");
    expect(r.trip.meta.title).toBe(t1.meta.title);
    expect(r.error).toBeTruthy();
  });
  it("何もなければ初期データ、ストレージ不可でも動く", () => {
    expect(loadTrip(memKV()).source).toBe("default");
    const r = loadTrip(null);
    expect(r.trip.members).toHaveLength(3);
    expect(r.error).toBeTruthy();
  });
  it("消去できる", () => {
    const kv = memKV();
    saveTrip(kv, createDefaultTrip());
    clearTrip(kv);
    expect(kv.getItem("drive-trip:v1")).toBeNull();
  });
  it("容量不足を伝える", () => {
    const kv: KV = { getItem: () => null, removeItem: () => {}, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } };
    expect(saveTrip(kv, createDefaultTrip())).toMatch(/容量/);
  });
  it("不正なJSONを拒否し、欠けた配列を補う", () => {
    expect(normalizeTrip(null)).toBeNull();
    expect(normalizeTrip({ schema: 2 })).toBeNull();
    const t = normalizeTrip({ schema: 1, tripId: "x", meta: { id: "meta", updatedAt: 0 }, members: [{ id: 1 }] });
    expect(t?.members).toEqual([]);
    expect(t?.votes).toEqual([]);
  });
});

describe("編集操作", () => {
  it("追加・更新・削除", () => {
    let t = createDefaultTrip(1);
    t = upsert(t, "messages", { id: "m1", updatedAt: 0, authorId: t.members[0].id, text: "やあ", createdAt: 5 }, 10);
    expect(t.messages[0].updatedAt).toBe(10);
    t = upsert(t, "messages", { ...t.messages[0], text: "修正" }, 20);
    expect(t.messages).toHaveLength(1);
    expect(t.messages[0].text).toBe("修正");
    t = remove(t, "messages", "m1", 30);
    expect(t.messages).toHaveLength(0);
    expect(t.tombstones).toContainEqual({ id: "messages:m1", deletedAt: 30 });
  });
});

describe("共有データのマージ", () => {
  it("新しい方を採用し、両方の追加を残す", () => {
    const base = createDefaultTrip(1);
    const a = upsert(base, "messages", { id: "ma", updatedAt: 0, authorId: "x", text: "A", createdAt: 1 }, 5);
    const b = upsert({ ...base, meta: { ...base.meta, title: "B案", updatedAt: 9 } }, "messages", { id: "mb", updatedAt: 0, authorId: "y", text: "B", createdAt: 2 }, 6);
    const m = mergeTrips(a, b);
    expect(m.messages.map((x) => x.id).sort()).toEqual(["ma", "mb"]);
    expect(m.meta.title).toBe("B案");
    expect(mergeTrips(b, a)).toEqual(m);
  });
  it("削除は古い編集より優先、新しい編集は削除より優先", () => {
    const base = upsert(createDefaultTrip(1), "votes", { id: "v", updatedAt: 0, spotId: "s", memberId: "m", value: "yes" }, 5);
    const deleted = remove(base, "votes", "v", 10);
    expect(mergeTrips(base, deleted).votes).toHaveLength(0);
    const edited = upsert(base, "votes", { ...base.votes[0], value: "no" }, 20);
    expect(mergeTrips(deleted, edited).votes[0].value).toBe("no");
  });
});

describe("同梱の観光地データ", () => {
  it("7都県すべてを含み、必須項目と関東圏の座標を持つ", () => {
    const prefs = new Set(spots.map((s) => s.pref));
    for (const p of PREFS) expect(prefs.has(p)).toBe(true);
    const ids = new Set<string>();
    for (const s of spots) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.name && s.address && s.description && s.fee).toBeTruthy();
      expect(GENRES).toContain(s.genre);
      expect(s.lat).toBeGreaterThan(34.8);
      expect(s.lat).toBeLessThan(37.2);
      expect(s.lng).toBeGreaterThan(138.3);
      expect(s.lng).toBeLessThan(141.0);
      if ("url" in s && s.url) expect(s.url).toMatch(/^https:\/\//);
    }
  });
});
