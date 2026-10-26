import { useState } from "react";
import type { SpotStatus, VoteValue } from "../types";
import { newId } from "../lib/trip";
import { baseNames, fmtDrive, fmtTime, mapsNavUrl, mapsSearchUrl, type Store } from "../state";
import { STATUS_LABEL } from "./SpotsTab";
import { Badge, ConfirmButton, Field, Sheet } from "./ui";

export const VOTE_LABEL: Record<VoteValue, string> = { yes: "賛成", no: "反対", hold: "保留" };

export function tallyVotes(s: Store, spotId: string) {
  const votes = s.trip.votes.filter((v) => v.spotId === spotId && s.trip.members.some((m) => m.id === v.memberId));
  return {
    votes,
    yes: votes.filter((v) => v.value === "yes").length,
    no: votes.filter((v) => v.value === "no").length,
    hold: votes.filter((v) => v.value === "hold").length,
  };
}

export function VoteButtons({ s, spotId }: { s: Store; spotId: string }) {
  const t = tallyVotes(s, spotId);
  const mine = t.votes.find((v) => v.memberId === s.me)?.value;
  return (
    <div className="stack tight">
      <div className="vote-row">
        {(["yes", "no", "hold"] as VoteValue[]).map((v) => (
          <button
            key={v}
            className={`vote ${v} ${mine === v ? "on" : ""}`}
            disabled={!s.me}
            onClick={() => s.put("votes", { id: `${spotId}__${s.me}`, updatedAt: 0, spotId, memberId: s.me, value: v })}
          >
            {VOTE_LABEL[v]} <b>{t[v]}</b>
          </button>
        ))}
      </div>
      {!s.me && <p className="hint">投票するには「ホーム」で自分の名前を選んでください。</p>}
      {t.votes.length > 0 && (
        <p className="muted small">{t.votes.map((v) => `${s.memberName(v.memberId)}：${VOTE_LABEL[v.value]}`).join("　")}</p>
      )}
    </div>
  );
}

export function SpotDetail({ s, spotId, onClose }: { s: Store; spotId: string; onClose: () => void }) {
  const sp = s.spotById.get(spotId);
  const st = s.trip.spotStates.find((x) => x.id === spotId);
  const [comment, setComment] = useState("");
  const [plan, setPlan] = useState(false);
  if (!sp) return null;
  const comments = s.trip.messages.filter((m) => m.spotId === spotId).sort((a, b) => a.createdAt - b.createdAt);
  const setState = (patch: { status?: SpotStatus | null; favorite?: boolean }) =>
    s.put("spotStates", { id: spotId, updatedAt: 0, status: st?.status ?? null, favorite: st?.favorite ?? false, ...patch });

  return (
    <Sheet title={sp.name} onClose={onClose}>
      <div className="stack">
        <div className="row wrap">
          <Badge kind="plain">{sp.pref}</Badge>
          <Badge kind="plain">{sp.genre}</Badge>
          {sp.coord === "approx" && <Badge kind="est">位置は概略</Badge>}
        </div>
        <p>{sp.description}</p>
        <dl className="kv">
          {sp.driveMin !== undefined && (
            <>
              <dt>所要時間</dt>
              <dd><b>{baseNames(s.trip.meta).full}から</b>車で{fmtDrive(sp.driveMin)}<span className="muted small">（渋滞なしの目安。年末年始は大幅に増えます）</span></dd>
            </>
          )}
          <dt>所在地</dt>
          <dd>{sp.address || "未登録"}</dd>
          <dt>参考料金</dt>
          <dd>{sp.fee || "未登録"}<span className="muted small">（料金・営業日は変わるため公式情報で確認）</span></dd>
          <dt>公式サイト</dt>
          <dd>{sp.url ? <a href={sp.url} target="_blank" rel="noreferrer">{sp.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : "未登録（Googleマップから検索してください）"}</dd>
        </dl>
        <div className="row wrap">
          <a className="btn" href={mapsSearchUrl(sp)} target="_blank" rel="noreferrer">Googleマップで開く</a>
          <a className="btn primary" href={mapsNavUrl(sp)} target="_blank" rel="noreferrer">ここへナビ</a>
        </div>

        <h3>自分たちの予定</h3>
        <div className="row wrap">
          {(["want", "hold", "no"] as SpotStatus[]).map((k) => (
            <button key={k} className={`chip ${st?.status === k ? "on" : ""}`} onClick={() => setState({ status: st?.status === k ? null : k })}>
              {STATUS_LABEL[k]}
            </button>
          ))}
          <button className={`chip ${st?.favorite ? "on" : ""}`} onClick={() => setState({ favorite: !st?.favorite })}>
            {st?.favorite ? "★ お気に入り" : "☆ お気に入り"}
          </button>
        </div>

        <h3>3人で投票</h3>
        <VoteButtons s={s} spotId={spotId} />

        <button className="btn" onClick={() => setPlan(true)}>旅程表に追加</button>
        {plan && <AddToPlan s={s} spotId={spotId} onDone={() => setPlan(false)} />}

        <h3>コメント（{comments.length}）</h3>
        <ul className="chat">
          {comments.map((m) => (
            <li key={m.id} className={m.authorId === s.me ? "mine" : ""}>
              <span className="who">{s.memberName(m.authorId)}・{fmtTime(m.createdAt)}</span>
              <span className="text">{m.text}</span>
              {m.authorId === s.me && <ConfirmButton className="link-btn" label="削除" onConfirm={() => s.del("messages", m.id)} />}
            </li>
          ))}
        </ul>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const text = comment.trim();
            if (!text || !s.me) return;
            const now = Date.now();
            s.put("messages", { id: newId(), updatedAt: now, authorId: s.me, spotId, text, createdAt: now });
            setComment("");
          }}
        >
          <input id="spot-comment" className="grow" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={s.me ? "コメントを書く" : "ホームで名前を選ぶと書けます"} disabled={!s.me} maxLength={500} />
          <button className="btn primary" disabled={!s.me || !comment.trim()}>送信</button>
        </form>
      </div>
    </Sheet>
  );
}

function AddToPlan({ s, spotId, onDone }: { s: Store; spotId: string; onDone: () => void }) {
  const sp = s.spotById.get(spotId)!;
  const [date, setDate] = useState(s.trip.meta.startDate || "");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:30");
  const [done, setDone] = useState(false);
  if (done) return <p className="ok-text">旅程表に追加しました。「旅程」タブで時間を調整できます。</p>;
  return (
    <form
      className="card inset stack"
      onSubmit={(e) => {
        e.preventDefault();
        const order = s.trip.itinerary.filter((i) => i.date === date).length;
        s.put("itinerary", { id: newId(), updatedAt: 0, date, start, end, title: sp.name, spotId, travelMin: 0, order, rainAlt: "", notes: "" });
        setDone(true);
        setTimeout(onDone, 2500);
      }}
    >
      <Field label="日付"><input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
      <div className="grid2">
        <Field label="開始"><input id="plan-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="終了"><input id="plan-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></Field>
      </div>
      <button className="btn primary" type="submit">追加する</button>
    </form>
  );
}
