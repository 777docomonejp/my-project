import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// 1ファイルのHTMLに全てをまとめる（どの無料静的ホスティングにも置ける）
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  test: { environment: "node" },
});
