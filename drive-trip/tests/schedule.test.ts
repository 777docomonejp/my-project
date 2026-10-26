import { describe, expect, it } from "vitest";
import { findOverlaps, groupByDate, moveItem, stayMinutes, toMin } from "../src/lib/schedule";
import type { ItineraryItem } from "../src/types";

const it_ = (id: string, date: string, start: string, end: string, order = 0): ItineraryItem => ({
  id, date, start, end, order, updatedAt: 0, title: id, travelMin: 0, rainAlt: "", notes: "",
});

describe("時刻", () => {
  it("HH:MM を分に", () => {
    expect(toMin("09:30")).toBe(570);
    expect(toMin("25:00")).toBe(1500);
    expect(toMin("abc")).toBeNull();
  });
  it("滞在時間（日付またぎ対応）", () => {
    expect(stayMinutes({ start: "10:00", end: "11:30" })).toBe(90);
    expect(stayMinutes({ start: "23:00", end: "01:00" })).toBe(120);
  });
});

describe("重複検知", () => {
  it("同じ日で重なる予定だけを警告", () => {
    const items = [
      it_("a", "2026-12-26", "10:00", "11:00"),
      it_("b", "2026-12-26", "10:30", "12:00"),
      it_("c", "2026-12-26", "12:00", "13:00"),
      it_("d", "2026-12-27", "10:00", "11:00"),
    ];
    expect(findOverlaps(items)).toEqual([["a", "b"]]);
  });
});

describe("並べ替え", () => {
  it("同じ日の中で入れ替える", () => {
    const items = [it_("a", "2026-12-26", "10:00", "11:00", 0), it_("b", "2026-12-26", "12:00", "13:00", 1), it_("x", "2026-12-27", "09:00", "10:00", 0)];
    const moved = moveItem(items, "b", -1, 5);
    const day = groupByDate(moved)[0][1].map((i) => i.id);
    expect(day).toEqual(["b", "a"]);
    expect(moved.find((i) => i.id === "x")!.updatedAt).toBe(0);
    expect(moveItem(items, "a", -1, 5)).toBe(items);
  });
});
