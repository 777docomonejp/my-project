import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import spotsJson from "./data/spots.json";
import type { Collection, Spot, Trip } from "./types";
import { loadTrip, remove, safeStorage, saveTrip, upsert } from "./lib/trip";

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

export function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
