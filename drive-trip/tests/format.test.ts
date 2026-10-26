import { describe, expect, it } from "vitest";
import { fmtDrive } from "../src/state";

describe("車の時間の表示", () => {
  it("1時間未満・ちょうど・端数あり", () => {
    expect(fmtDrive(40)).toBe("約40分");
    expect(fmtDrive(120)).toBe("約2時間");
    expect(fmtDrive(100)).toBe("約1時間40分");
  });
});
