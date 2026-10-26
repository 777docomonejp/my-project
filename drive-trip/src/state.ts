import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import spotsJson from "./data/spots.json";
import type { Collection, Spot, Trip } from "./types";
import { httpDoc, newShareKey, putInUrl, readShareKey, remember, type CloudDoc } from "./lib/remote";
import { decideCloud, loadTrip, mergeTrips, normalizeTrip, readStash, remove, safeStorage, saveTrip, stashTrip, upsert } from "./lib/trip";

export const BUILTIN_SPOTS = spotsJson as Spot[];

const ME_KEY = "drive-trip:me";
const PASS_KEY = "drive-trip:pass";

function readPref(key: string): string {
  try {
    return globalThis.localStorage?.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function writePref(key: string, v: string) {
  try {
    if (v) globalThis.localStorage?.setItem(key, v);
    else globalThis.localStorage?.removeItem(key);
  } catch {
    /* 保存できない環境では無視 */
  }
}

// クラウド保存：claude.ai で開いたときはページの db、Vercel 版では自前サーバー。どちらも無ければ端末保存のみ。
type ClaudeRuntime = { use?: (n: string) => Promise<{ doc(p: string): CloudDoc } | null> };
declare const __SERVER__: boolean;
const SERVER = typeof __SERVER__ !== "undefined" && __SERVER__;

export type CloudStatus = "off" | "nokey" | "connecting" | "saved" | "saving" | "readonly" | "error" | "conflict";

function parseCloud(d: Record<string, unknown> | undefined): Trip | null {
  try {
    return typeof d?.json === "string" ? normalizeTrip(JSON.parse(d.json)) : null;
  } catch {
    return null;
  }
}

export function useTripStore() {
  const kv = useMemo(() => safeStorage(), []);
  const initial = useMemo(() => loadTrip(kv), [kv]);
  const [trip, setTrip] = useState<Trip>(initial.trip);
  const [notice, setNotice] = useState<string | undefined>(initial.error);
  const [me, setMeState] = useState(readPref(ME_KEY));
  const [pass, setPassState] = useState(readPref(PASS_KEY));
  // 読み込んだ直後は保存し直さない（自動バックアップを上書きしないため）
  const skipSave = useRef(initial.source === "saved");

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const err = saveTrip(kv, trip);
    if (err && kv) setNotice(`${err}。共有タブからバックアップを取ってください。`);
  }, [kv, trip]);

  // ---- クラウド保存 ----
  const [cloud, setCloud] = useState<CloudStatus>("off");
  const [conflict, setConflict] = useState<Trip | null>(null);
  const doc = useRef<CloudDoc | null>(null);
  const lastCloudJson = useRef<string>("");
  const ready = useRef(false);
  const tripRef = useRef(trip);
  tripRef.current = trip;

  const [shareKey, setShareKey] = useState(() => (SERVER ? readShareKey() : ""));

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const claude = (globalThis as unknown as { claude?: ClaudeRuntime }).claude;
      let ref: CloudDoc | null = null;
      if (claude?.use) {
        setCloud("connecting");
        const db = await claude.use("db").catch(() => null);
        ref = db ? db.doc("trips/main") : null;
      } else if (SERVER) {
        if (!shareKey) return setCloud("nokey");
        setCloud("connecting");
        ref = httpDoc(shareKey);
      }
      if (!alive) return;
      if (!ref) return setCloud("off");
      doc.current = ref;
      unsub = ref.onSnapshot(
        (snap) => {
          const remote = snap.exists ? parseCloud(snap.data()) : null;
          if (remote) lastCloudJson.current = JSON.stringify(remote);
          const local = tripRef.current;
          const d = decideCloud(local, remote);
          if (d === "conflict") {
            setConflict(remote);
            setCloud("conflict");
            return;
          }
          if (d === "adopt" && remote) setTrip(remote);
          if (d === "merge" && remote) setTrip((cur) => mergeTrips(cur, remote));
          ready.current = true;
          setCloud((c) => (c === "readonly" ? c : "saved"));
          if (d === "push") setTrip((cur) => ({ ...cur })); // 保存処理を走らせる
        },
        () => setCloud((c) => (c === "conflict" ? c : "error")),
      );
    })();
    return () => {
      alive = false;
      unsub?.();
      doc.current = null;
      ready.current = false;
    };
  }, [shareKey]);

  const createShareKey = useCallback(() => {
    const k = newShareKey();
    remember(k);
    putInUrl(k);
    setShareKey(k);
  }, []);

  // 変更をクラウドへ（まとめて1.5秒後に1回）
  useEffect(() => {
    const ref = doc.current;
    if (!ref || !ready.current || cloud === "readonly" || cloud === "conflict") return;
    const json = JSON.stringify(trip);
    if (json === lastCloudJson.current) return;
    if (json.length > 240_000) {
      setNotice("データが大きくなりすぎてクラウドに保存できません。古いチャットを削除するか、バックアップを取ってください。");
      return;
    }
    if (cloud !== "error") setCloud("saving");
    const timer = setTimeout(async () => {
      try {
        await ref.set({ json, savedAt: Date.now() });
        lastCloudJson.current = json;
        setCloud("saved");
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "conflict") return; // 最新を統合したあと自動でもう一度保存される
        if (code === "too_large") setNotice("データが大きくなりすぎて保存できません。古いチャットを削除してください。");
        setCloud(code === "invalid_argument" ? "readonly" : "error");
      }
    }, cloud === "error" ? 15_000 : 1500); // つながらないときは15秒ごとに再試行
    return () => clearTimeout(timer);
  }, [trip, cloud]);

  const resolveConflict = useCallback(
    (use: "local" | "cloud") => {
      if (!conflict) return;
      if (use === "cloud") {
        stashTrip(kv, tripRef.current);
        setTrip(conflict);
        lastCloudJson.current = JSON.stringify(conflict);
      } else {
        stashTrip(kv, conflict);
        lastCloudJson.current = "";
      }
      setConflict(null);
      ready.current = true;
      setCloud("saved");
    },
    [conflict, kv],
  );

  const put = useCallback(<C extends Collection>(c: C, rec: Trip[C][number]) => setTrip((t) => upsert(t, c, rec)), []);
  const del = useCallback((c: Collection, id: string) => setTrip((t) => remove(t, c, id)), []);

  const spots = useMemo(() => [...BUILTIN_SPOTS, ...trip.customSpots], [trip.customSpots]);
  const spotById = useMemo(() => new Map(spots.map((s) => [s.id, s])), [spots]);
  const memberName = useCallback((id: string) => trip.members.find((m) => m.id === id)?.name ?? "（不明）", [trip.members]);

  return {
    trip,
    setTrip,
    put,
    del,
    spots,
    spotById,
    memberName,
    notice,
    setNotice,
    me: trip.members.some((m) => m.id === me) ? me : "",
    setMe: (v: string) => {
      setMeState(v);
      writePref(ME_KEY, v);
    },
    pass,
    setPass: (v: string) => {
      setPassState(v);
      writePref(PASS_KEY, v);
    },
    storageOk: !!kv,
    cloud,
    conflict,
    resolveConflict,
    stash: () => readStash(kv),
    shareKey,
    createShareKey,
    server: SERVER,
  };
}

export type Store = ReturnType<typeof useTripStore>;

export const mapsSearchUrl = (s: Pick<Spot, "name" | "address">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`;
export const mapsNavUrl = (s: Pick<Spot, "name" | "address">) =>
  `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(`${s.name} ${s.address}`)}`;

export const hasCoords = (s: Spot) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && !(s.lat === 0 && s.lng === 0);

export function fmtDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d || "日付未定";
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${Number(m[2])}/${Number(m[3])}（${"日月火水木金土"[dt.getDay()]}）`;
}

/** 車の時間：40 → 約40分、100 → 約1時間40分 */
export function fmtDrive(min: number): string {
  if (min < 60) return `約${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `約${h}時間${m ? `${m}分` : ""}`;
}

export function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
