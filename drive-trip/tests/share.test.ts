import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, generatePassphrase } from "../src/lib/share";
import { createDefaultTrip } from "../src/lib/trip";

describe("共有コード", () => {
  it("同じ合言葉で復元できる", async () => {
    const t = createDefaultTrip(1);
    const code = await encodeShare(t, "abcd-efgh-jkmn");
    expect(code.startsWith("DT1.")).toBe(true);
    expect(code).not.toContain("豊中");
    expect(await decodeShare(code, "abcd-efgh-jkmn")).toEqual(t);
  });
  it("合言葉が違うと読めない", async () => {
    const code = await encodeShare(createDefaultTrip(), "correct-pass");
    await expect(decodeShare(code, "wrong-pass!")).rejects.toThrow(/合言葉/);
  });
  it("途中で切れたコード・形式違いを拒否", async () => {
    const code = await encodeShare(createDefaultTrip(), "correct-pass");
    await expect(decodeShare(code.slice(0, -10), "correct-pass")).rejects.toThrow();
    await expect(decodeShare("hello", "correct-pass")).rejects.toThrow(/形式/);
  });
  it("短い合言葉は拒否、自動生成は十分な長さ", async () => {
    await expect(encodeShare(createDefaultTrip(), "short")).rejects.toThrow();
    const p = generatePassphrase();
    expect(p).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(generatePassphrase()).not.toBe(p);
  });
});
