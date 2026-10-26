import { useMemo, useState } from "react";
import type { ItineraryItem } from "../types";
import { newId } from "../lib/trip";
import { findOverlaps, groupByDate, moveItem, stayMinutes } from "../lib/schedule";
import { fmtDate, mapsNavUrl, type Store } from "../state";
import { ConfirmButton, Field, Sheet, numOr } from "./ui";

const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ""}` : `${m}分`);

export function PlanTab({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const [edit, setEdit] = useState<ItineraryItem | null>(null);
  const groups = useMemo(() => groupByDate(s.trip.itinerary), [s.trip.itinerary]);
  const overlaps = useMemo(() => findOverlaps(s.trip.itinerary), [s.trip.itinerary]);
  const overlapIds = new Set(overlaps.flat());

  return (
    <div className="stack">
      <div className="row-between">
        <h2>旅程表</h2>
        <button
          className="btn primary small"
          onClick={() => setEdit({ id: newId(), updatedAt: 0, date: s.trip.meta.startDate, start: "10:00", end: "11:00", title: "", travelMin: 0, order: 999, rainAlt: "", notes: "" })}
        >
          ＋予定を追加
        </button>
      </div>
      {overlaps.length > 0 && (
        <div className="alert warn" role="alert">
          時間が重なっている予定が{overlaps.length}組あります：
          {overlaps.map(([a, b]) => {
            const n = (id: string) => s.trip.itinerary.find((i) => i.id === id)?.title;
            return <div key={a + b}>・{n(a)} と {n(b)}</div>;
          })}
        </div>
      )}
      {groups.length === 0 && <p className="empty">予定がありません。「＋予定を追加」か、観光地の詳細から「旅程表に追加」してください。</p>}
      {groups.map(([date, items], dayIdx) => (
        <section key={date} className="day">
          <h3 className="day-head">
            <span className="day-num">DAY {dayIdx + 1}</span>
            {fmtDate(date)}
          </h3>
          <ol className="timeline">
            {items.map((it, i) => {
              const stay = stayMinutes(it);
              const sp = it.spotId ? s.spotById.get(it.spotId) : undefined;
              return (
                <li key={it.id} className={overlapIds.has(it.id) ? "overlap" : ""}>
                  {it.travelMin > 0 && <div className="travel">移動 約{fmtDur(it.travelMin)}</div>}
                  <div className="slot">
                    <div className="time">
                      <span>{it.start}</span>
                      <span className="muted">{it.end}</span>
                    </div>
                    <div className="slot-main">
                      <button className="slot-title" onClick={() => setEdit(it)}>{it.title || "（無題）"}</button>
                      <div className="muted small">
                        {stay !== null && `滞在 ${fmtDur(stay)}`}
                        {overlapIds.has(it.id) && <span className="warn-text">・時間が重複</span>}
                      </div>
                      {it.rainAlt && <div className="small rain">雨天時：{it.rainAlt}</div>}
                      {it.notes && <div className="small muted">{it.notes}</div>}
                      <div className="row wrap small-gap">
                        {sp && <button className="link-btn" onClick={() => onOpenSpot(sp.id)}>観光地の詳細</button>}
                        {sp && <a className="link-btn" href={mapsNavUrl(sp)} target="_blank" rel="noreferrer">ナビ</a>}
                      </div>
                    </div>
                    <div className="reorder">
                      <button aria-label="上へ" disabled={i === 0} onClick={() => s.setTrip((t) => ({ ...t, itinerary: moveItem(t.itinerary, it.id, -1, Date.now()) }))}>▲</button>
                      <button aria-label="下へ" disabled={i === items.length - 1} onClick={() => s.setTrip((t) => ({ ...t, itinerary: moveItem(t.itinerary, it.id, 1, Date.now()) }))}>▼</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {edit && (
        <ItemSheet
          s={s}
          item={edit}
          isNew={!s.trip.itinerary.some((i) => i.id === edit.id)}
          onClose={() => setEdit(null)}
          onSave={(it) => {
            s.put("itinerary", it);
            setEdit(null);
          }}
          onDelete={() => {
            s.del("itinerary", edit.id);
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function ItemSheet({ s, item, isNew, onSave, onDelete, onClose }: { s: Store; item: ItineraryItem; isNew: boolean; onSave: (i: ItineraryItem) => void; onDelete: () => void; onClose: () => void }) {
  const [it, setIt] = useState(item);
  const set = (k: keyof ItineraryItem) => (e: { target: { value: string } }) => setIt({ ...it, [k]: e.target.value });
  const wanted = s.spots.filter((sp) => s.trip.spotStates.some((x) => x.id === sp.id && x.status !== "no"));
  return (
    <Sheet title={isNew ? "予定を追加" : "予定を編集"} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!it.title.trim()) return;
          onSave(isNew ? { ...it, order: s.trip.itinerary.filter((i) => i.date === it.date).length } : it);
        }}
      >
        <Field label="訪問先・予定"><input id="it-title" value={it.title} onChange={set("title")} required /></Field>
        <Field label="観光地と紐づけ（任意）">
          <select id="it-spot" value={it.spotId ?? ""} onChange={(e) => {
            const sp = s.spotById.get(e.target.value);
            setIt({ ...it, spotId: e.target.value || undefined, title: it.title || sp?.name || "" });
          }}>
            <option value="">なし</option>
            {(wanted.length ? wanted : s.spots).map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </Field>
        <Field label="日付"><input id="it-date" type="date" value={it.date} onChange={set("date")} required /></Field>
        <div className="grid2">
          <Field label="開始"><input id="it-start" type="time" value={it.start} onChange={set("start")} required /></Field>
          <Field label="終了"><input id="it-end" type="time" value={it.end} onChange={set("end")} required /></Field>
        </div>
        <Field label="直前の移動時間（分）" hint="前の予定からの移動。目安として入力してください。">
          <input id="it-travel" inputMode="numeric" value={it.travelMin || ""} onChange={(e) => setIt({ ...it, travelMin: Math.max(0, numOr(e.target.value)) })} />
        </Field>
        <Field label="雨天時の代わり"><input id="it-rain" value={it.rainAlt} onChange={set("rainAlt")} placeholder="例：鉄道博物館" /></Field>
        <Field label="メモ"><textarea id="it-notes" rows={2} value={it.notes} onChange={set("notes")} /></Field>
        <div className="row">
          <button className="btn primary" type="submit">保存</button>
          {!isNew && <ConfirmButton label="削除" onConfirm={onDelete} />}
        </div>
      </form>
    </Sheet>
  );
}
