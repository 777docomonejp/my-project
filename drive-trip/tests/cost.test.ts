import { describe, expect, it } from "vitest";
import { fuelCost, settle, splitYen, summarize } from "../src/lib/cost";
import type { CostItem, Member } from "../src/types";

const members: Member[] = [
  { id: "a", name: "A", updatedAt: 0 },
  { id: "b", name: "B", updatedAt: 0 },
  { id: "c", name: "C", updatedAt: 0 },
];
const item = (p: Partial<CostItem>): CostItem => ({
  id: Math.random().toString(), updatedAt: 0, category: "food", leg: "local", label: "", amount: 0,
  confirmed: true, payerId: "a", splitAmong: [], note: "", ...p,
});

describe("fuelCost", () => {
  it("距離÷燃費×単価を円に丸める", () => {
    expect(fuelCost(520, 15, 170)).toBe(5893); // 34.666..L × 170 = 5893.3
    expect(fuelCost(100, 10, 165.5)).toBe(1655);
  });
  it("不正値やゼロは0", () => {
    expect(fuelCost(0, 15, 170)).toBe(0);
    expect(fuelCost(100, 0, 170)).toBe(0);
    expect(fuelCost(100, NaN, 170)).toBe(0);
    expect(fuelCost(undefined, 15, 170)).toBe(0);
  });
});

describe("splitYen", () => {
  it("端数を含めて合計が一致する", () => {
    const s = splitYen(1000, ["a", "b", "c"]);
    expect(s).toEqual({ a: 334, b: 333, c: 333 });
    expect(Object.values(s).reduce((x, y) => x + y)).toBe(1000);
  });
  it("負担者がいなければ空", () => expect(splitYen(100, [])).toEqual({}));
});

describe("summarize", () => {
  it("往路・復路・現地を別々に集計し、概算と確認済みを分ける", () => {
    const s = summarize(
      [
        item({ category: "fuel", leg: "outbound", distanceKm: 300, kmPerL: 15, yenPerL: 170, confirmed: false }),
        item({ category: "toll", leg: "outbound", amount: 9000, confirmed: false }),
        item({ category: "toll", leg: "return", amount: 9000 }),
        item({ category: "food", leg: "local", amount: 3000, payerId: "b" }),
      ],
      members,
    );
    expect(s.byLeg).toEqual({ outbound: 12400, return: 9000, local: 3000, other: 0 });
    expect(s.total).toBe(24400);
    expect(s.estimateTotal).toBe(12400);
    expect(s.confirmedTotal).toBe(12000);
  });

  it("立替と負担から精算額を出す（全員の差額の合計は0）", () => {
    const s = summarize(
      [
        item({ amount: 9000, payerId: "a" }),
        item({ amount: 3000, payerId: "b" }),
        item({ amount: 1000, payerId: "c", splitAmong: ["b", "c"] }),
      ],
      members,
    );
    const by = Object.fromEntries(s.perPerson.map((p) => [p.memberId, p]));
    expect(by.a.owed).toBe(4000);
    expect(by.b.owed).toBe(4500);
    expect(by.c.owed).toBe(4500);
    expect(by.a.balance).toBe(5000);
    expect(s.perPerson.reduce((x, p) => x + p.balance, 0)).toBe(0);
    const received = s.transfers.filter((t) => t.to === "a").reduce((x, t) => x + t.amount, 0);
    expect(received).toBe(5000);
    expect(s.transfers).toEqual([
      { from: "c", to: "a", amount: 3500 },
      { from: "b", to: "a", amount: 1500 },
    ]);
  });

  it("存在しない支払者は未割当として数える", () => {
    const s = summarize([item({ amount: 300, payerId: "zzz" })], members);
    expect(s.unassigned).toBe(300);
    expect(s.perPerson.every((p) => p.owed === 100)).toBe(true);
  });
});

describe("settle", () => {
  it("釣り合っていれば送金なし", () => {
    expect(settle([{ memberId: "a", balance: 0 }, { memberId: "b", balance: 0 }])).toEqual([]);
  });
});
