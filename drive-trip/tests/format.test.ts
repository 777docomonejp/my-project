import { describe, expect, it } from "vitest";
import { fmtDrive } from "../src/state";

describe("車の時間の表示", () => {
  it("1時間未満・ちょうど・端数あり", () => {
    expect(fmtDrive(40)).toBe("約40分");
    expect(fmtDrive(120)).toBe("約2時間");
    expect(fmtDrive(100)).toBe("約1時間40分");
  });
});

import { baseNames } from "../src/state";
describe("所要時間の起点", () => {
  it("未設定なら しょーいちの家（戸田）、一覧用はかっこを外す", () => {
    expect(baseNames({})).toEqual({ full: "しょーいちの家（戸田）", short: "しょーいちの家" });
    expect(baseNames({ baseName: "たけしの家(戸田)" }).short).toBe("たけしの家");
  });
});
