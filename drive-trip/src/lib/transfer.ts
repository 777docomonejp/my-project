// claude.ai 版 → Vercel 版（3人共有アプリ）へのデータ引っ越し。
// 旅行データを圧縮して URL の #import= に入れ、共有アプリ側で取り込む。

import type { Trip } from "../types";
import { normalizeTrip } from "./trip";

/** 3人共有アプリ（Vercel 版）のURL */
export const SHARED_APP_URL = "https://my-project-drive-trip.vercel.app/";

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const buf = await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64u(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encodeTransfer(trip: Trip): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(trip));
  return "z" + b64u(await pipe(raw, new CompressionStream("deflate-raw")));
}

export async function decodeTransfer(code: string): Promise<Trip | null> {
  try {
    if (!code.startsWith("z")) return null;
    const raw = await pipe(unb64u(code.slice(1)), new DecompressionStream("deflate-raw"));
    return normalizeTrip(JSON.parse(new TextDecoder().decode(raw)));
  } catch {
    return null;
  }
}

/** URLの #import=... を読む（なければ空） */
export function readImportCode(): string {
  const m = /(?:^#|&)import=([A-Za-z0-9_-]+)/.exec(location.hash);
  return m ? m[1] : "";
}
