// 旅行データの保存API（Vercel Functions）。データベースは Neon（無料枠）を DATABASE_URL で指定する。
//
// - URLに含まれる共有キーを知っている人だけが読み書きできる。DBにはキーそのものではなくハッシュを保存する。
// - 書き込みは版番号つき（baseVersion が今の版と一致したときだけ保存）。食い違ったら 409 で最新を返し、
//   端末側で統合してから再保存するので、3人が同時に編集しても上書きで消えない。

import { neon } from "@neondatabase/serverless";

const MAX_BYTES = 400_000;
const KEY_RE = /^[A-Za-z0-9_-]{22,64}$/;

export interface TripStore {
  get(id: string): Promise<{ json: string; version: number } | null>;
  /** baseVersion が一致したときだけ保存し、新しい版を返す。一致しなければ null。保存した版は履歴にも残す。 */
  put(id: string, json: string, baseVersion: number): Promise<number | null>;
  /** 履歴（新しい順） */
  history(id: string, limit: number): Promise<{ version: number; json: string; savedAt: string }[]>;
}

const HISTORY_KEEP = 200;

function neonStore(url: string): TripStore {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS drive_trip (
        id text PRIMARY KEY,
        json text NOT NULL,
        version integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS drive_trip_history (
        id text NOT NULL,
        version integer NOT NULL,
        json text NOT NULL,
        saved_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (id, version)
      )`;
      // 履歴を作る前から保存されていたデータも、最初の1回だけ履歴に入れておく
      await sql`INSERT INTO drive_trip_history (id, version, json, saved_at)
                SELECT id, version, json, updated_at FROM drive_trip ON CONFLICT DO NOTHING`;
    })());
  return {
    async get(id) {
      await init();
      const rows = await sql`SELECT json, version FROM drive_trip WHERE id = ${id}`;
      return rows.length ? { json: String(rows[0].json), version: Number(rows[0].version) } : null;
    },
    async put(id, json, baseVersion) {
      await init();
      const rows =
        baseVersion === 0
          ? await sql`INSERT INTO drive_trip (id, json, version) VALUES (${id}, ${json}, 1) ON CONFLICT (id) DO NOTHING RETURNING version`
          : await sql`UPDATE drive_trip SET json = ${json}, version = version + 1, updated_at = now()
                      WHERE id = ${id} AND version = ${baseVersion} RETURNING version`;
      if (!rows.length) return null;
      const version = Number(rows[0].version);
      await sql`INSERT INTO drive_trip_history (id, version, json) VALUES (${id}, ${version}, ${json}) ON CONFLICT DO NOTHING`;
      await sql`DELETE FROM drive_trip_history WHERE id = ${id} AND version <= ${version - HISTORY_KEEP}`;
      return version;
    },
    async history(id, limit) {
      await init();
      const rows = await sql`SELECT version, json, saved_at FROM drive_trip_history WHERE id = ${id} ORDER BY version DESC LIMIT ${limit}`;
      return rows.map((r) => ({ version: Number(r.version), json: String(r.json), savedAt: new Date(r.saved_at as string).toISOString() }));
    },
  };
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`drive-trip:${key}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function summarize(text: string) {
  try {
    const t = JSON.parse(text);
    const n = (k: string) => (Array.isArray(t[k]) ? t[k].length : 0);
    return { title: String(t.meta?.title ?? ""), costs: n("costs"), itinerary: n("itinerary"), messages: n("messages"), spots: n("spotStates"), hotels: n("hotels") };
  } catch {
    return null;
  }
}

export async function handle(req: Request, store: TripStore): Promise<Response> {
  const key = new URL(req.url).searchParams.get("k") ?? "";
  if (!KEY_RE.test(key)) return json({ error: "共有キーが正しくありません" }, 400);
  const id = await hashKey(key);

  if (req.method === "GET") {
    const params = new URL(req.url).searchParams;
    if (params.get("history") === "1") {
      // 一覧は件数の要約だけ返す。中身は version を指定して1件ずつ取る
      const rows = await store.history(id, 60);
      const want = Number(params.get("version"));
      if (Number.isInteger(want) && want > 0) {
        const hit = rows.find((r) => r.version === want);
        return hit ? json(hit) : json({ error: "その版は見つかりません" }, 404);
      }
      return json({ versions: rows.map((r) => ({ version: r.version, savedAt: r.savedAt, summary: summarize(r.json) })) });
    }
    const cur = await store.get(id);
    return json(cur ?? { json: null, version: 0 });
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "データが大きすぎます" }, 413);
    let body: { json?: unknown; baseVersion?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "JSONが正しくありません" }, 400);
    }
    const baseVersion = Number(body.baseVersion);
    if (typeof body.json !== "string" || !Number.isInteger(baseVersion) || baseVersion < 0) return json({ error: "形式が正しくありません" }, 400);
    try {
      const trip = JSON.parse(body.json);
      if (trip?.schema !== 1 || typeof trip.tripId !== "string") throw new Error();
    } catch {
      return json({ error: "旅行データではありません" }, 400);
    }
    const version = await store.put(id, body.json, baseVersion);
    if (version === null) {
      const cur = await store.get(id);
      return json(cur ?? { json: null, version: 0 }, 409);
    }
    return json({ version });
  }

  return json({ error: "未対応の操作です" }, 405);
}

let store: TripStore | null = null;
function getStore(): TripStore | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return (store ??= neonStore(url));
}

async function route(req: Request): Promise<Response> {
  const s = getStore();
  if (!s) return json({ error: "DATABASE_URL が設定されていません" }, 500);
  try {
    return await handle(req, s);
  } catch (e) {
    console.error(e);
    return json({ error: "サーバーでエラーが起きました" }, 500);
  }
}

export const GET = route;
export const PUT = route;
