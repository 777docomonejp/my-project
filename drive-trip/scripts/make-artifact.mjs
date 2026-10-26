// dist/index.html（完全なHTML）から、claude.ai アーティファクト用の本文だけのHTMLを作る。
// アーティファクトは公開時に <html><head><body> を自動で付けるため、それらのタグを取り除く。
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
const keepHead = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim();
writeFileSync("dist/artifact.html", `${keepHead}\n${body.trim()}\n`);
console.log(`dist/artifact.html: ${(Buffer.byteLength(keepHead + body) / 1024).toFixed(0)} KB`);
