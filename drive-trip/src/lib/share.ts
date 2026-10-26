// 共有コード：旅行データを「合言葉」で暗号化した文字列。
// サーバーを使わず、LINE等で3人の間でコピー＆ペーストして同期する。
// 暗号：PBKDF2(SHA-256, 200,000回) で鍵を作り AES-GCM(256bit) で暗号化。合言葉を知らない人は中身を読めない。

import type { Trip } from "../types";
import { normalizeTrip } from "./trip";

const PREFIX = "DT1";
const ITER = 200_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

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

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const buf = await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

const canCompress = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

async function key(pass: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** 推測されにくい合言葉を作る（紛らわしい文字を除いた 4文字×3 ブロック、約60bit） */
export function generatePassphrase(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  const s = Array.from(a, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export async function encodeShare(trip: Trip, pass: string): Promise<string> {
  if (pass.trim().length < 8) throw new Error("合言葉は8文字以上にしてください");
  let body: Uint8Array<ArrayBuffer> = enc.encode(JSON.stringify(trip));
  const z = canCompress();
  if (z) body = await pipe(body, new CompressionStream("deflate-raw"));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pass, salt), body));
  return [PREFIX, z ? "z" : "n", b64u(salt), b64u(iv), b64u(ct)].join(".");
}

export async function decodeShare(code: string, pass: string): Promise<Trip> {
  const parts = code.replace(/\s+/g, "").split(".");
  if (parts.length !== 5 || parts[0] !== PREFIX) throw new Error("共有コードの形式が正しくありません。全文をコピーできているか確認してください");
  const [, mode, salt, iv, ct] = parts;
  let plain: Uint8Array<ArrayBuffer>;
  try {
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64u(iv) }, await key(pass, unb64u(salt)), unb64u(ct)));
  } catch {
    throw new Error("合言葉が違うか、コードが途中で切れています");
  }
  if (mode === "z") {
    if (!canCompress()) throw new Error("このブラウザは圧縮形式に未対応です。iOS 16.4以降のSafariなど最新ブラウザで開いてください");
    plain = await pipe(plain, new DecompressionStream("deflate-raw"));
  }
  const trip = normalizeTrip(JSON.parse(dec.decode(plain)));
  if (!trip) throw new Error("旅行データとして読み込めませんでした");
  return trip;
}
