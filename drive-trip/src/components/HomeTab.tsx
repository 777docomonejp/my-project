import { useState } from "react";
import type { BookingStatus, Hotel, Member, TripMeta } from "../types";
import { newId } from "../lib/trip";
import { summarize, yen } from "../lib/cost";
import { fmtDate, type Store } from "../state";
import { Badge, ConfirmButton, Field, Sheet, copyText, numOr } from "./ui";
import { shareUrl } from "../lib/remote";

const STATUSES: BookingStatus[] = ["未確認", "未予約", "予約済み", "キャンセル"];

export function HomeTab({ s, go }: { s: Store; go: (tab: string) => void }) {
  const { trip } = s;
  const [editMeta, setEditMeta] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const sum = summarize(trip.costs, trip.members);
  const want = trip.spotStates.filter((x) => x.status === "want").length;

  return (
    <div className="stack">
      {s.conflict && (
        <section className="card conflict" role="alert">
          <h2>保存データが2つあります</h2>
          <p className="small">
            この端末のデータ（{s.trip.meta.title}・費用{s.trip.costs.length}件・予定{s.trip.itinerary.length}件）と、
            クラウドのデータ（{s.conflict.meta.title}・費用{s.conflict.costs.length}件・予定{s.conflict.itinerary.length}件）が別々に入力されています。
            使う方を選んでください。選ばなかった方もこの端末に退避され、「共有 → バックアップ」から戻せます。
          </p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => s.resolveConflict("local")}>この端末のデータを使う</button>
            <button className="btn" onClick={() => s.resolveConflict("cloud")}>クラウドのデータを使う</button>
          </div>
        </section>
      )}
      <ShareLinkCard s={s} />
      <section className="hero">
        <div className="hero-sign">
          <p className="eyebrow">{trip.meta.title}</p>
          <Countdown start={trip.meta.startDate} end={trip.meta.endDate} />
          <div className="route">
            <div className="route-end">
              <small>出発</small>
              <strong>{trip.meta.origin}</strong>
            </div>
            <span className="route-line" aria-hidden="true" />
            <div className="route-end right">
              <small>合流</small>
              <strong>{trip.meta.meetPoint}</strong>
            </div>
          </div>
        </div>
        <div className="hero-body">
          <dl className="kv">
            <dt>出発</dt>
            <dd>{trip.meta.departure || "未定"}</dd>
            <dt>帰り</dt>
            <dd>{trip.meta.endDate ? fmtDate(trip.meta.endDate) : "未定"}</dd>
            <dt>車</dt>
            <dd>{trip.meta.car}</dd>
          </dl>
          {trip.meta.notes && <p className="muted small">{trip.meta.notes}</p>}
          <button className="btn" onClick={() => setEditMeta(true)}>
            旅行の基本情報を編集
          </button>
          <CloudLine s={s} />
        </div>
      </section>

      <section className="tiles">
        <button className="tile" onClick={() => go("cost")}>
          <span className="tile-label">1人あたり（目安）</span>
          <span className="tile-num">{trip.members.length ? yen(sum.total / trip.members.length) : "—"}</span>
          <span className="tile-sub">合計 {yen(sum.total)}・うち概算 {yen(sum.estimateTotal)}</span>
        </button>
        <button className="tile" onClick={() => go("spots")}>
          <span className="tile-label">行きたい</span>
          <span className="tile-num">{want}か所</span>
          <span className="tile-sub">観光地から選ぶ</span>
        </button>
      </section>

      <section className="card">
        <h2>あなたは誰？</h2>
        <p className="muted small">この端末の利用者を選ぶと、チャットや投票があなたの名前で記録されます。</p>
        <div className="chips">
          {trip.members.map((m) => (
            <button key={m.id} className={`chip ${s.me === m.id ? "on" : ""}`} onClick={() => s.setMe(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
      </section>

      <MembersCard s={s} />

      <section className="card">
        <div className="row-between">
          <h2>宿泊</h2>
          <button
            className="btn small"
            onClick={() =>
              setHotel({ id: newId(), updatedAt: 0, chain: "", name: "", address: "", checkIn: "", checkOut: "", status: "未確認", price: 0, priceConfirmed: false, url: "", notes: "" })
            }
          >
            ＋追加
          </button>
        </div>
        <ul className="list">
          {trip.hotels.map((h) => (
            <li key={h.id} className="list-item" onClick={() => setHotel(h)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setHotel(h)}>
              <div>
                <strong>{h.chain}</strong> {h.name}
                <div className="muted small">
                  {h.checkIn ? `${fmtDate(h.checkIn)} 〜 ${fmtDate(h.checkOut)}` : "宿泊日未定"}
                  {h.address && `・${h.address}`}
                </div>
              </div>
              <div className="right">
                <Badge kind={h.status === "予約済み" ? "ok" : h.status === "キャンセル" ? "muted" : "warn"}>{h.status}</Badge>
                {h.price > 0 && <div className="small">{yen(h.price)}{h.priceConfirmed ? "" : "（概算）"}</div>}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">宿泊料金を費用に含めるには「費用」タブで宿泊費として登録してください（負担する人を指定できます）。</p>
      </section>

      {editMeta && <MetaSheet meta={trip.meta} onSave={(m) => { s.setTrip((t) => ({ ...t, meta: { ...m, updatedAt: Date.now() } })); setEditMeta(false); }} onClose={() => setEditMeta(false)} />}
      {hotel && (
        <HotelSheet
          hotel={hotel}
          isNew={!trip.hotels.some((h) => h.id === hotel.id)}
          onSave={(h) => { s.put("hotels", h); setHotel(null); }}
          onDelete={() => { s.del("hotels", hotel.id); setHotel(null); }}
          onClose={() => setHotel(null)}
        />
      )}
    </div>
  );
}

function MembersCard({ s }: { s: Store }) {
  const [edit, setEdit] = useState<Member | null>(null);
  return (
    <section className="card">
      <div className="row-between">
        <h2>メンバー（{s.trip.members.length}人）</h2>
        <button className="btn small" onClick={() => setEdit({ id: newId(), updatedAt: 0, name: "" })}>
          ＋追加
        </button>
      </div>
      <ul className="list">
        {s.trip.members.map((m) => (
          <li key={m.id} className="list-item" role="button" tabIndex={0} onClick={() => setEdit(m)} onKeyDown={(e) => e.key === "Enter" && setEdit(m)}>
            <span>{m.name}</span>
            <span className="muted small">{s.me === m.id ? "この端末" : "編集"}</span>
          </li>
        ))}
      </ul>
      {edit && (
        <Sheet title="メンバー" onClose={() => setEdit(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
              if (!name) return;
              s.put("members", { ...edit, name });
              setEdit(null);
            }}
          >
            <Field label="名前（ニックネーム推奨）">
              <input id="member-name" name="name" defaultValue={edit.name} required maxLength={20} autoFocus />
            </Field>
            <div className="row">
              <button className="btn primary" type="submit">保存</button>
              {s.trip.members.some((m) => m.id === edit.id) && s.trip.members.length > 1 && (
                <ConfirmButton label="削除" onConfirm={() => { s.del("members", edit.id); setEdit(null); }} />
              )}
            </div>
          </form>
        </Sheet>
      )}
    </section>
  );
}

function MetaSheet({ meta, onSave, onClose }: { meta: TripMeta; onSave: (m: TripMeta) => void; onClose: () => void }) {
  const [m, setM] = useState(meta);
  const set = (k: keyof TripMeta) => (e: { target: { value: string } }) => setM({ ...m, [k]: e.target.value });
  return (
    <Sheet title="旅行の基本情報" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(m); }}>
        <Field label="旅行名"><input id="meta-title" value={m.title} onChange={set("title")} /></Field>
        <Field label="出発（自由記述）"><input id="meta-dep" value={m.departure} onChange={set("departure")} /></Field>
        <div className="grid2">
          <Field label="開始日"><input id="meta-start" type="date" value={m.startDate} onChange={set("startDate")} /></Field>
          <Field label="帰着日"><input id="meta-end" type="date" value={m.endDate} onChange={set("endDate")} /></Field>
        </div>
        <Field label="出発地"><input id="meta-origin" value={m.origin} onChange={set("origin")} /></Field>
        <Field label="合流地点"><input id="meta-meet" value={m.meetPoint} onChange={set("meetPoint")} /></Field>
        <Field label="車"><input id="meta-car" value={m.car} onChange={set("car")} /></Field>
        <Field label="メモ"><textarea id="meta-notes" rows={3} value={m.notes} onChange={set("notes")} /></Field>
        <button className="btn primary" type="submit">保存</button>
      </form>
    </Sheet>
  );
}

function HotelSheet({ hotel, isNew, onSave, onDelete, onClose }: { hotel: Hotel; isNew: boolean; onSave: (h: Hotel) => void; onDelete: () => void; onClose: () => void }) {
  const [h, setH] = useState(hotel);
  const set = (k: keyof Hotel) => (e: { target: { value: string } }) => setH({ ...h, [k]: e.target.value });
  return (
    <Sheet title="宿泊先" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(h); }}>
        <div className="grid2">
          <Field label="チェーン"><input id="hotel-chain" list="hotel-chains" value={h.chain} onChange={set("chain")} /></Field>
          <Field label="予約状況">
            <select id="hotel-status" value={h.status} onChange={set("status")}>
              {STATUSES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <datalist id="hotel-chains"><option value="アパホテル" /><option value="ルートイン" /></datalist>
        <Field label="ホテル名"><input id="hotel-name" value={h.name} onChange={set("name")} /></Field>
        <Field label="住所"><input id="hotel-address" value={h.address} onChange={set("address")} /></Field>
        <div className="grid2">
          <Field label="チェックイン"><input id="hotel-in" type="date" value={h.checkIn} onChange={set("checkIn")} /></Field>
          <Field label="チェックアウト"><input id="hotel-out" type="date" value={h.checkOut} onChange={set("checkOut")} /></Field>
        </div>
        <div className="grid2">
          <Field label="料金（円・合計）"><input id="hotel-price" inputMode="numeric" value={h.price || ""} onChange={(e) => setH({ ...h, price: numOr(e.target.value) })} /></Field>
          <Field label="料金の確認">
            <select id="hotel-price-ok" value={h.priceConfirmed ? "1" : "0"} onChange={(e) => setH({ ...h, priceConfirmed: e.target.value === "1" })}>
              <option value="0">概算</option>
              <option value="1">確認済み（予約画面等）</option>
            </select>
          </Field>
        </div>
        <Field label="予約ページURL"><input id="hotel-url" type="url" value={h.url} onChange={set("url")} /></Field>
        <Field label="メモ"><textarea id="hotel-notes" rows={2} value={h.notes} onChange={set("notes")} /></Field>
        <div className="row">
          <button className="btn primary" type="submit">保存</button>
          {h.url && /^https?:\/\//.test(h.url) && <a className="btn" href={h.url} target="_blank" rel="noreferrer">予約ページを開く</a>}
          {!isNew && <ConfirmButton label="削除" onConfirm={onDelete} />}
        </div>
      </form>
    </Sheet>
  );
}

const CLOUD_TEXT: Record<Store["cloud"], string> = {
  off: "この端末だけに保存中。ほかの端末やホーム画面のアプリとは自動で共有されません",
  nokey: "まだ3人で共有していません（この端末だけに保存中）",
  connecting: "クラウドに接続中…",
  saved: "保存済み。共有URLを開いた3人とも同じ内容が見られます",
  saving: "クラウドに保存中…",
  readonly: "閲覧のみの権限のため、変更はこの端末だけに保存されます",
  error: "クラウドに接続できません。変更はこの端末に保存され、つながると保存されます",
  conflict: "保存データの選択待ち（上のカードで選んでください）",
};

function CloudLine({ s }: { s: Store }) {
  return <p className={`cloud-line ${s.cloud}`}>{CLOUD_TEXT[s.cloud]}</p>;
}

/** Vercel 版：共有URLの作成と、2人に送るためのコピー */
export function ShareLinkCard({ s, always = false }: { s: Store; always?: boolean }) {
  const [msg, setMsg] = useState("");
  if (!s.server) return null;
  if (!s.shareKey) {
    return (
      <section className="card share-card">
        <h2>3人で共有する</h2>
        <p className="small">共有URLを作ると、このURLを開いた3人が同じ内容を見て、それぞれ編集できます。今この端末に入っている内容がそのまま共有されます。</p>
        <button className="btn primary" onClick={s.createShareKey}>共有URLを作る</button>
      </section>
    );
  }
  if (!always && s.me) return null;
  const url = shareUrl(s.shareKey);
  return (
    <section className="card share-card">
      <h2>このURLを2人に送る</h2>
      <p className="small">URLを知っている人は誰でも見て編集できます。3人以外には教えないでください。</p>
      <input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="共有URL" />
      <button
        className="btn primary"
        onClick={async () => setMsg((await copyText(url)) ? "コピーしました。LINEに貼って送ってください。" : "上の欄を長押ししてコピーしてください。")}
      >
        URLをコピー
      </button>
      {msg && <p className="ok-text small">{msg}</p>}
    </section>
  );
}

/** 出発日までの日数（端末の日付で計算） */
export function daysUntil(date: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t0.getTime()) / 86_400_000);
}

function Countdown({ start, end }: { start: string; end: string }) {
  const d = daysUntil(start);
  if (d === null) return <p className="countdown"><span className="cd-label">出発日は未定</span></p>;
  if (d > 0)
    return (
      <p className="countdown">
        <span className="cd-label">出発まで あと</span>
        <span className="cd-num">{d}</span>
        <span className="cd-label">日</span>
      </p>
    );
  const back = daysUntil(end);
  const label = d === 0 ? "今日出発" : back !== null && back < 0 ? "おかえりなさい" : "旅の途中";
  return <p className="countdown"><span className="cd-num word">{label}</span></p>;
}
