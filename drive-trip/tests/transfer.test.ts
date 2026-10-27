import { describe, expect, it } from "vitest";
import { decodeTransfer, encodeTransfer } from "../src/lib/transfer";
import { createDefaultTrip, upsert } from "../src/lib/trip";

describe("claude.ai 版からの引っ越し", () => {
  it("圧縮してURLに入れ、元に戻せる", async () => {
    const t = upsert(createDefaultTrip(1), "messages", { id: "m", updatedAt: 0, authorId: "x", text: "ちゃんこ行こう", createdAt: 1 }, 5);
    const code = await encodeTransfer(t);
    expect(code).toMatch(/^z[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(JSON.stringify(t).length);
    expect(await decodeTransfer(code)).toEqual(t);
  });
  it("壊れたコードは null", async () => {
    expect(await decodeTransfer("zzzz")).toBeNull();
    expect(await decodeTransfer("abc")).toBeNull();
  });
});
