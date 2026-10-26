import { useCallback, useMemo, useState } from "react";
import { GENRES, PREFS, type Genre, type Pref, type Spot, type SpotStatus } from "../types";
import { newId } from "../lib/trip";
import type { Store } from "../state";
import { MapView } from "./MapView";
import { Field, Sheet, numOr } from "./ui";

export const STATUS_LABEL: Record<SpotStatus, string> = { want: "行きたい", hold: "保留", no: "行かない" };

export function SpotsTab({ s, onOpen }: { s: Store; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [pref, setPref] = useState<Pref | "">("");
  const [genre, setGenre] = useState<Genre | "">("");
  const [status, setStatus] = useState<SpotStatus | "fav" | "">("");
  const [view, setView] = useState<"list" | "map">("list");
  const [adding, setAdding] = useState(false);

  const stateMap = useMemo(() => new Map(s.trip.spotStates.map((x) => [x.id, x])), [s.trip.spotStates]);
  const statusOf = useCallback((id: string) => stateMap.get(id)?.status ?? null, [stateMap]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return s.spots.filter((sp) => {
      if (pref && sp.pref !== pref) return false;
      if (genre && sp.genre !== genre) return false;
      const st = stateMap.get(sp.id);
      if (status === "fav" && !st?.favorite) return false;
      if (status && status !== "fav" && st?.status !== status) return false;
      if (k && !`${sp.name} ${sp.address} ${sp.description} ${sp.genre}`.toLowerCase().includes(k)) return false;
      return true;
    });
  }, [s.spots, q, pref, genre, status, stateMap]);

  return (
    <div className="stack">
      <div className="toolbar">
        <input id="spot-search" type="search" placeholder="観光地を検索（例：温泉、夜景、川越）" value={q} onChange={(e) => setQ(e.target.value)} aria-label="検索" />
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>一覧</button>
          <button role="tab" aria-selected={view === "map"} className={view === "map" ? "on" : ""} onClick={() => setView("map")}>地図</button>
        </div>
      </div>
      <div className="filters">
        <select id="f-pref" value={pref} onChange={(e) => setPref(e.target.value as Pref | "")} aria-label="県">
          <option value="">全ての県</option>
          {PREFS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select id="f-genre" value={genre} onChange={(e) => setGenre(e.target.value as Genre | "")} aria-label="ジャンル">
          <option value="">全ジャンル</option>
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as SpotStatus | "fav" | "")} aria-label="状態">
          <option value="">全て</option>
          <option value="fav">★お気に入り</option>
          <option value="want">行きたい</option>
          <option value="hold">保留</option>
          <option value="no">行かない</option>
        </select>
      </div>
      <p className="muted small">{filtered.length}件。座標は概略位置です。正確な場所・営業日・料金はGoogleマップや公式サイトで確認してください。</p>

      {view === "map" && <MapView spots={filtered} statusOf={statusOf} onSelect={onOpen} />}

      <ul className="spot-list">
        {filtered.map((sp) => {
          const st = stateMap.get(sp.id);
          return (
            <li key={sp.id}>
              <button className="spot" onClick={() => onOpen(sp.id)}>
                <span className={`dot ${st?.status ?? "none"}`} aria-hidden="true" />
                <span className="spot-main">
                  <span className="spot-name">
                    {st?.favorite && <span className="star" aria-label="お気に入り">★</span>}
                    {sp.name}
                  </span>
                  <span className="muted small">
                    {sp.pref}・{sp.genre}
                    {st?.status && `・${STATUS_LABEL[st.status]}`}
                    {sp.custom && "・追加した場所"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && <p className="empty">条件に合う観光地がありません。絞り込みを解除してください。</p>}
      <button className="btn" onClick={() => setAdding(true)}>＋ 観光地を自分で追加</button>
      {adding && <AddSpotSheet onClose={() => setAdding(false)} onSave={(sp) => { s.put("customSpots", sp); setAdding(false); }} />}
    </div>
  );
}

function AddSpotSheet({ onClose, onSave }: { onClose: () => void; onSave: (s: Spot & { updatedAt: number }) => void }) {
  const [sp, setSp] = useState<Spot & { updatedAt: number }>({
    id: "c-" + newId(), name: "", pref: "埼玉", address: "", genre: "街歩き", description: "", fee: "", url: "", lat: 0, lng: 0, coord: "approx", custom: true, updatedAt: 0,
  });
  const [latlng, setLatlng] = useState("");
  const set = (k: keyof Spot) => (e: { target: { value: string } }) => setSp({ ...sp, [k]: e.target.value });
  return (
    <Sheet title="観光地を追加" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sp.name.trim()) return;
          const m = /(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)/.exec(latlng);
          const lat = m ? numOr(m[1]) : 0;
          const lng = m ? numOr(m[2]) : 0;
          const valid = lat > 20 && lat < 46 && lng > 122 && lng < 154;
          onSave({ ...sp, lat: valid ? lat : 0, lng: valid ? lng : 0 });
        }}
      >
        <Field label="名前"><input id="ns-name" value={sp.name} onChange={set("name")} required /></Field>
        <div className="grid2">
          <Field label="県">
            <select id="ns-pref" value={sp.pref} onChange={set("pref")}>{PREFS.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
          <Field label="ジャンル">
            <select id="ns-genre" value={sp.genre} onChange={set("genre")}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select>
          </Field>
        </div>
        <Field label="所在地"><input id="ns-addr" value={sp.address} onChange={set("address")} /></Field>
        <Field label="説明"><textarea id="ns-desc" rows={2} value={sp.description} onChange={set("description")} /></Field>
        <Field label="参考料金"><input id="ns-fee" value={sp.fee} onChange={set("fee")} /></Field>
        <Field label="公式サイトURL"><input id="ns-url" type="url" value={sp.url} onChange={set("url")} /></Field>
        <Field label="緯度,経度（任意）" hint="Googleマップで場所を長押しすると表示される「35.81, 139.67」の形式。空欄なら地図にピンは出ません。">
          <input id="ns-latlng" value={latlng} onChange={(e) => setLatlng(e.target.value)} inputMode="decimal" placeholder="35.8176, 139.6779" />
        </Field>
        <button className="btn primary" type="submit">追加</button>
      </form>
    </Sheet>
  );
}

