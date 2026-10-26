import { describe, expect, it } from "vitest";
import { handle, type TripStore } from "../api/trip";
import { httpDoc, isShareKey, newShareKey, type Snapshot } from "../src/lib/remote";
import { createDefaultTrip, mergeTrips, upsert } from "../src/lib/trip";

function memStore(): TripStore & { rows: Map<string, { json: string; version: number }> } {
  const rows = new Map<string, { json: string; version: number }>();
  return {
    rows,
    get: async (id) => rows.get(id) ?? null,
    put: async (id, json, base) => {
      if ((rows.get(id)?.version ?? 0) !== base) return null;
      rows.set(id, { json, version: base + 1 });
      return base + 1;
    },
  };
}
const KEY = "abcdefghijklmnopqrstuvwx";
const call = (store: TripStore, method: string, body?: unknown, key = KEY) =>
  handle(new Request(`http://x/api/trip?k=${key}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }), store);
const tripJson = () => JSON.stringify(createDefaultTrip(1));

describe("保存API", () => {
  it("最初は空、保存すると読める", async () => {
    const s = memStore();
    expect(await (await call(s, "GET")).json()).toEqual({ json: null, version: 0 });
    const j = tripJson();
    expect(await (await call(s, "PUT", { json: j, baseVersion: 0 })).json()).toEqual({ version: 1 });
    expect(await (await call(s, "GET")).json()).toEqual({ json: j, version: 1 });
  });
  it("版が古い書き込みは 409 で最新を返す（上書きしない）", async () => {
    const s = memStore();
    await call(s, "PUT", { json: tripJson(), baseVersion: 0 });
    const r = await call(s, "PUT", { json: tripJson(), baseVersion: 0 });
    expect(r.status).toBe(409);
    expect((await r.json()).version).toBe(1);
  });
  it("キーなし・短いキー・旅行データ以外・大きすぎるデータを拒否", async () => {
    const s = memStore();
    expect((await call(s, "GET", undefined, "short")).status).toBe(400);
    expect((await call(s, "PUT", { json: "{}", baseVersion: 0 })).status).toBe(400);
    expect((await call(s, "PUT", { json: "x".repeat(500_000), baseVersion: 0 })).status).toBe(413);
    expect((await call(s, "DELETE")).status).toBe(405);
  });
  it("DBにはキーそのものを保存しない", async () => {
    const s = memStore();
    await call(s, "PUT", { json: tripJson(), baseVersion: 0 });
    expect([...s.rows.keys()][0]).not.toContain(KEY);
    expect([...s.rows.keys()][0]).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("共有キー", () => {
  it("推測されにくい長さで毎回違う", () => {
    const k = newShareKey();
    expect(isShareKey(k)).toBe(true);
    expect(k.length).toBeGreaterThanOrEqual(24);
    expect(newShareKey()).not.toBe(k);
  });
});

describe("同期（2人が同時に保存）", () => {
  it("後から保存した人は 409 を受けて最新を統合し、両方の変更が残る", async () => {
    const s = memStore();
    const fetchFn = ((url: string, init?: RequestInit) => handle(new Request(`http://x${url}`, init), s)) as typeof fetch;
    const base = createDefaultTrip(1);
    await call(s, "PUT", { json: JSON.stringify(base), baseVersion: 0 });

    const seen: { a: Snapshot[]; b: Snapshot[] } = { a: [], b: [] };
    const A = httpDoc(KEY, { fetchFn, intervalMs: 1e9 });
    const B = httpDoc(KEY, { fetchFn, intervalMs: 1e9 });
    const ua = A.onSnapshot((x) => seen.a.push(x));
    const ub = B.onSnapshot((x) => seen.b.push(x));
    await new Promise((r) => setTimeout(r, 20));
    expect(seen.a).toHaveLength(1);

    const a = upsert(base, "messages", { id: "ma", updatedAt: 0, authorId: "x", text: "Aの投稿", createdAt: 1 }, 10);
    const b = upsert(base, "messages", { id: "mb", updatedAt: 0, authorId: "y", text: "Bの投稿", createdAt: 2 }, 11);
    await A.set({ json: JSON.stringify(a) });
    await expect(B.set({ json: JSON.stringify(b) })).rejects.toEqual({ code: "conflict" });
    // B は届いた最新（Aの投稿入り）と統合して保存し直す
    const latest = JSON.parse(String(seen.b.at(-1)!.data()!.json));
    const merged = mergeTrips(b, latest);
    await B.set({ json: JSON.stringify(merged) });
    const final = JSON.parse((await (await call(s, "GET")).json()).json);
    expect(final.messages.map((m: { id: string }) => m.id).sort()).toEqual(["ma", "mb"]);
    ua();
    ub();
  });
});
