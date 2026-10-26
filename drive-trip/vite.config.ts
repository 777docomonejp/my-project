import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { handle, type TripStore } from "./api/trip";

// Vercel でビルドしたとき（または DRIVE_TRIP_SERVER=1）は、自前サーバーで3人共有する版になる
const SERVER = process.env.VERCEL === "1" || process.env.DRIVE_TRIP_SERVER === "1";

/** ローカル確認用：/api/trip をメモリ上の保存先で動かす（本番は Vercel Functions + Neon） */
function localApi(): Plugin {
  const rows = new Map<string, { json: string; version: number }>();
  const store: TripStore = {
    get: async (id) => rows.get(id) ?? null,
    put: async (id, json, base) => {
      const cur = rows.get(id);
      if ((cur?.version ?? 0) !== base) return null;
      rows.set(id, { json, version: base + 1 });
      return base + 1;
    },
  };
  const mw = async (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/api/trip")) return next();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const r = await handle(new Request(`http://local${req.url}`, { method: req.method, body: req.method === "GET" ? undefined : Buffer.concat(chunks) }), store);
    res.statusCode = r.status;
    res.setHeader("content-type", "application/json");
    res.end(await r.text());
  };
  return {
    name: "local-api",
    configureServer: (s) => void s.middlewares.use(mw),
    configurePreviewServer: (s) => void s.middlewares.use(mw),
  };
}

// 1ファイルのHTMLに全てをまとめる（どの無料静的ホスティングにも置ける）
export default defineConfig({
  base: "./",
  define: { __SERVER__: JSON.stringify(SERVER) },
  plugins: [react(), viteSingleFile(), ...(SERVER && !process.env.VERCEL ? [localApi()] : [])],
  test: { environment: "node" },
});
