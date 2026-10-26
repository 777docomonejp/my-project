import { describe, expect, it } from "vitest";
import { createDefaultTrip, decideCloud, isPristine, loadTrip, mergeTrips, readStash, saveTrip, stashTrip, upsert, type KV } from "../src/lib/trip";

const kv = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const edited = (now = 1) => {
  const t = createDefaultTrip(now);
  return upsert(t, "costs", { ...t.costs[0], label: "入力済み" }, now + 100);
};

describe("初期データの判定", () => {
  it("作ったままなら未編集、1か所でも編集すれば編集済み", () => {
    const t = createDefaultTrip(1);
    expect(isPristine(t)).toBe(true);
    expect(isPristine(edited())).toBe(false);
    expect(isPristine({ ...t, meta: { ...t.meta, title: "x", updatedAt: 9 } })).toBe(false);
  });
});

describe("端末とクラウドの統合方針", () => {
  it("クラウドが空なら端末のデータを保存", () => expect(decideCloud(edited(), null)).toBe("push"));
  it("未編集の端末（ホーム画面に追加した直後など）はクラウドを採用", () => {
    expect(decideCloud(createDefaultTrip(5), edited())).toBe("adopt");
  });
  it("クラウドが未編集なら端末の入力済みデータを保存", () => {
    expect(decideCloud(edited(), createDefaultTrip(5))).toBe("push");
  });
  it("同じ旅行は統合、差がなければ何もしない", () => {
    const a = edited();
    expect(decideCloud(a, a)).toBe("same");
    const b = upsert(a, "messages", { id: "m", updatedAt: 0, authorId: "x", text: "hi", createdAt: 1 }, 500);
    expect(decideCloud(a, b)).toBe("merge");
    expect(mergeTrips(a, b).messages).toHaveLength(1);
  });
  it("別々に入力された2つのデータは勝手に捨てず、選択を求める", () => {
    expect(decideCloud(edited(1), edited(2))).toBe("conflict");
  });
});

describe("退避とアップデート後の読み込み", () => {
  it("置き換えたデータを退避して戻せる", () => {
    const s = kv();
    const t = edited();
    stashTrip(s, t);
    expect(readStash(s)).toEqual(t);
  });
  it("以前の版で保存したデータ（後から増えた欄がない形）もそのまま読める", () => {
    const s = kv();
    const t = edited();
    const old = JSON.parse(JSON.stringify(t));
    delete old.customSpots;
    delete old.tombstones;
    s.setItem("drive-trip:v1", JSON.stringify(old));
    const r = loadTrip(s);
    expect(r.source).toBe("saved");
    expect(r.trip.costs[0].label).toBe("入力済み");
    expect(r.trip.customSpots).toEqual([]);
    saveTrip(s, r.trip);
    expect(loadTrip(s).trip.costs[0].label).toBe("入力済み");
  });
});
