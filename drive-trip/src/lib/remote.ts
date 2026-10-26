// 自前サーバー（Vercel + Neon）との同期。claude.ai 版の db と同じ形（onSnapshot / set）で使えるようにする。

export interface Snapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface CloudDoc {
  set(d: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (s: Snapshot) => void, err?: (e: { code: string }) => void): () => void;
}

const KEY_RE = /^[A-Za-z0-9_-]{22,64}$/;
const STORE_KEY = "drive-trip:share-key";

export const isShareKey = (k: string) => KEY_RE.test(k);

export function newShareKey(): string {
  const a = crypto.getRandomValues(new Uint8Array(18)); // 144bit：推測できない長さ
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** URLの #k=... から共有キーを読む。なければ端末に覚えたキー。 */
export function readShareKey(): string {
  const m = /(?:^#|&)k=([A-Za-z0-9_-]{22,64})/.exec(location.hash);
  if (m) {
    remember(m[1]);
    return m[1];
  }
  try {
    const k = localStorage.getItem(STORE_KEY) ?? "";
    if (isShareKey(k)) {
      putInUrl(k);
      return k;
    }
  } catch {
    /* 保存できない環境 */
  }
  return "";
}

export function remember(k: string) {
  try {
    localStorage.setItem(STORE_KEY, k);
  } catch {
    /* 保存できない環境 */
  }
}

export function putInUrl(k: string) {
  try {
    history.replaceState(null, "", `${location.pathname}${location.search}#k=${k}`);
  } catch {
    location.hash = `k=${k}`;
  }
}

export function shareUrl(k: string): string {
  return `${location.origin}${location.pathname}#k=${k}`;
}

const snap = (json: string | null): Snapshot => ({
  exists: json !== null,
  data: () => (json === null ? undefined : { json }),
});

interface Options {
  fetchFn?: typeof fetch;
  intervalMs?: number;
  idleMs?: number;
}

/**
 * サーバーのデータを定期的に確認し、変わったときだけ next を呼ぶ。
 * 画面が隠れている間と、15分以上操作がない間は確認を止める（無料枠のデータベースを無駄に起こさないため）。
 */
export function httpDoc(key: string, opts: Options = {}): CloudDoc {
  const fetchFn = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const interval = opts.intervalMs ?? 20_000;
  const idle = opts.idleMs ?? 15 * 60_000;
  const url = `/api/trip?k=${encodeURIComponent(key)}`;
  let version = -1;
  let failed = false;
  const listeners = new Set<(s: Snapshot) => void>();
  const deliver = (json: string | null) => listeners.forEach((l) => l(snap(json)));

  async function pull(onErr?: (e: { code: string }) => void) {
    try {
      const r = await fetchFn(url, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { json: string | null; version: number };
      if (d.version !== version || failed) {
        version = d.version;
        failed = false;
        deliver(d.json);
      }
    } catch {
      failed = true;
      onErr?.({ code: "unavailable" });
    }
  }

  return {
    onSnapshot(next, err) {
      listeners.add(next);
      let last = Date.now();
      const active = () => {
        last = Date.now();
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          active();
          void pull(err);
        }
      };
      const hasDom = typeof document !== "undefined";
      if (hasDom) {
        document.addEventListener("visibilitychange", onVisible);
        document.addEventListener("pointerdown", active, { passive: true });
        document.addEventListener("keydown", active);
      }
      void pull(err);
      const timer = setInterval(() => {
        if (hasDom && document.visibilityState !== "visible") return;
        if (Date.now() - last > idle) return;
        void pull(err);
      }, interval);
      return () => {
        listeners.delete(next);
        clearInterval(timer);
        if (hasDom) {
          document.removeEventListener("visibilitychange", onVisible);
          document.removeEventListener("pointerdown", active);
          document.removeEventListener("keydown", active);
        }
      };
    },

    async set(d) {
      let r: Response;
      try {
        r = await fetchFn(url, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ json: d.json, baseVersion: Math.max(0, version) }),
        });
      } catch {
        throw { code: "unavailable" };
      }
      if (r.status === 409) {
        // 他の人が先に保存していた：最新を渡して統合してもらい、統合後にもう一度保存される
        const cur = (await r.json()) as { json: string | null; version: number };
        version = cur.version;
        deliver(cur.json);
        throw { code: "conflict" };
      }
      if (r.status === 413) throw { code: "too_large" };
      if (!r.ok) throw { code: "unavailable" };
      version = ((await r.json()) as { version: number }).version;
    },
  };
}
