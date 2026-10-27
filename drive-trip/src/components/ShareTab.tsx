import { useMemo, useState } from "react";
import { createDefaultTrip, mergeTrips, newId, normalizeTrip } from "../lib/trip";
import { fetchHistory, fetchVersion, type HistoryEntry } from "../lib/remote";
import { fmtTime, type Store } from "../state";
import { tallyVotes, VoteButtons } from "./SpotDetail";
import { ShareLinkCard } from "./HomeTab";
import { ConfirmButton, copyText } from "./ui";

export function ShareTab({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const [section, setSection] = useState<"url" | "chat" | "vote" | "backup">(s.server ? "url" : "chat");
  return (
    <div className="stack">
      <div className="seg wide" role="tablist">
        {([["url", "共有URL"], ["chat", "チャット"], ["vote", "投票"], ["backup", "バックアップ"]] as const).filter(([k]) => s.server || k !== "url").map(([k, v]) => (
          <button key={k} role="tab" aria-selected={section === k} className={section === k ? "on" : ""} onClick={() => setSection(k)}>{v}</button>
        ))}
      </div>
      {section === "chat" && <Chat s={s} onOpenSpot={onOpenSpot} />}
      {section === "vote" && <Votes s={s} onOpenSpot={onOpenSpot} />}
      {section === "url" && <ShareUrl s={s} />}
      {section === "backup" && <Backup s={s} />}
    </div>
  );
}

function Chat({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const [text, setText] = useState("");
  const msgs = useMemo(() => [...s.trip.messages].sort((a, b) => a.createdAt - b.createdAt), [s.trip.messages]);
  return (
    <section className="stack">
      <p className="muted small">メッセージは共有URLを開いている3人に届きます（20秒ほどで反映）。</p>
      {msgs.length === 0 && <p className="empty">まだメッセージはありません。</p>}
      <ul className="chat">
        {msgs.map((m) => {
          const sp = m.spotId ? s.spotById.get(m.spotId) : undefined;
          return (
            <li key={m.id} className={m.authorId === s.me ? "mine" : ""}>
              <span className="who">{s.memberName(m.authorId)}・{fmtTime(m.createdAt)}</span>
              {sp && <button className="link-btn small" onClick={() => onOpenSpot(sp.id)}>#{sp.name}</button>}
              <span className="text">{m.text}</span>
              {m.authorId === s.me && <ConfirmButton className="link-btn" label="削除" onConfirm={() => s.del("messages", m.id)} />}
            </li>
          );
        })}
      </ul>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || !s.me) return;
          const now = Date.now();
          s.put("messages", { id: newId(), updatedAt: now, authorId: s.me, text: t, createdAt: now });
          setText("");
        }}
      >
        <input id="chat-input" className="grow" value={text} onChange={(e) => setText(e.target.value)} placeholder={s.me ? "メッセージ" : "ホームで名前を選ぶと書けます"} disabled={!s.me} maxLength={1000} />
        <button className="btn primary" disabled={!s.me || !text.trim()}>送信</button>
      </form>
    </section>
  );
}

function Votes({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const ids = new Set([...s.trip.votes.map((v) => v.spotId), ...s.trip.spotStates.filter((x) => x.status === "want" || x.favorite).map((x) => x.id)]);
  const list = [...ids].map((id) => s.spotById.get(id)).filter((x) => !!x);
  const n = s.trip.members.length;
  return (
    <section className="stack">
      <p className="muted small">「行きたい」「お気に入り」にした観光地と、投票された観光地が並びます。過半数が賛成すると「決定」になります。</p>
      {list.length === 0 && <p className="empty">候補がありません。観光地タブで「行きたい」を付けてください。</p>}
      {list
        .map((sp) => ({ sp, t: tallyVotes(s, sp.id) }))
        .sort((a, b) => b.t.yes - a.t.yes)
        .map(({ sp, t }) => {
          const decided = t.yes > n / 2;
          const inPlan = s.trip.itinerary.some((i) => i.spotId === sp.id);
          return (
            <div key={sp.id} className={`card vote-card ${decided ? "decided" : ""}`}>
              <div className="row-between">
                <button className="slot-title" onClick={() => onOpenSpot(sp.id)}>{sp.name}</button>
                {decided && <span className="badge ok">決定</span>}
              </div>
              <VoteButtons s={s} spotId={sp.id} />
              {decided && !inPlan && (
                <button className="btn small" onClick={() => onOpenSpot(sp.id)}>旅程表に追加する</button>
              )}
              {inPlan && <span className="muted small">旅程表に追加済み</span>}
            </div>
          );
        })}
    </section>
  );
}

function ShareUrl({ s }: { s: Store }) {
  return (
    <section className="stack">
      <ShareLinkCard s={s} always />
      {s.shareKey && (
        <p className="muted small">このURLを開いた3人の変更は自動で保存され、20秒ほどでほかの人の画面にも反映されます。保存ボタンはありません。</p>
      )}
    </section>
  );
}

function Backup({ s }: { s: Store }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const json = useMemo(() => JSON.stringify(s.trip), [s.trip]);
  const download = async () => {
    const filename = `drive-trip-${new Date().toISOString().slice(0, 10)}.json`;
    const data = JSON.stringify(s.trip, null, 1);
    try {
      // claude.ai のページ内では専用の保存機能を使う（通常のダウンロードは許可されないため）
      const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<{ save: (o: { filename: string; data: string }) => Promise<unknown> } | null> } }).claude;
      const dl = claude?.use ? await claude.use("downloads") : null;
      if (dl) {
        await dl.save({ filename, data });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      setMsg("ファイル保存を開始しました。保存できなかった場合は「テキストでコピー」を使ってください。");
    } catch {
      setMsg("ファイル保存できませんでした。「テキストでコピー」を使ってください。");
    }
  };
  const restore = (raw: string) => {
    try {
      const t = normalizeTrip(JSON.parse(raw));
      if (!t) throw new Error();
      s.setTrip((cur) => (cur.tripId === t.tripId ? mergeTrips(cur, t) : t));
      setMsg("バックアップから復元しました。");
      setText("");
    } catch {
      setMsg("バックアップとして読み込めませんでした。全文をコピーできているか確認してください。");
    }
  };
  return (
    <section className="stack">
      <div className="card stack">
        <h2>バックアップを取る</h2>
        <p className="muted small">データはこの端末のブラウザ内だけに保存されています。ブラウザのデータ削除・機種変更で消えるので、旅行前と旅行中に1回ずつ取っておくと安心です。</p>
        <div className="row wrap">
          <button className="btn primary" onClick={download}>ファイルに保存</button>
          <button className="btn" onClick={async () => setMsg((await copyText(json)) ? "コピーしました。メモアプリ等に貼って保存してください。" : "コピーできませんでした。")}>テキストでコピー</button>
        </div>
      </div>
      <div className="card stack">
        <h2>復元する</h2>
        <input id="restore-file" type="file" accept="application/json,.json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) restore(await f.text()); e.target.value = ""; }} />
        <textarea id="restore-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="コピーしたバックアップを貼り付け" />
        <button className="btn" disabled={!text.trim()} onClick={() => restore(text)}>貼り付けから復元</button>
      </div>
      {msg && <div className="alert ok" role="status">{msg}</div>}
      {s.server && s.shareKey && <ServerHistory s={s} />}
      {s.stash() && (
        <div className="card stack">
          <h2>退避したデータ</h2>
          <p className="muted small">クラウドとの切り替え時に退避したデータ（{s.stash()!.meta.title}）があります。今のデータと統合して戻せます。</p>
          <button className="btn" onClick={() => { const st = s.stash(); if (st) { s.setTrip((cur) => (cur.tripId === st.tripId ? mergeTrips(cur, st) : st)); setMsg("退避したデータを戻しました。"); } }}>退避したデータを戻す</button>
        </div>
      )}
      <div className="card stack">
        <h2>初期状態に戻す</h2>
        <p className="muted small">この端末のデータを全て消して初期データに戻します。先にバックアップを取ってください。</p>
        <ConfirmButton label="全データを消去" confirmLabel="もう一度押すと消去" onConfirm={() => { s.setTrip(createDefaultTrip()); setMsg("初期状態に戻しました。"); }} />
      </div>
      {!s.storageOk && <div className="alert warn">この端末ではブラウザ保存が使えません。ページを閉じるとデータが消えます。</div>}
    </section>
  );
}

/** Vercel 版：サーバーに残っている過去の版から戻す */
function ServerHistory({ s }: { s: Store }) {
  const [list, setList] = useState<HistoryEntry[] | null>(null);
  const [msg, setMsg] = useState("");
  const load = async () => {
    setMsg("");
    try {
      setList(await fetchHistory(s.shareKey));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "履歴を読み込めませんでした");
    }
  };
  const restore = async (v: number) => {
    try {
      const t = normalizeTrip(JSON.parse(await fetchVersion(s.shareKey, v)));
      if (!t) throw new Error("その版を読み込めませんでした");
      s.replaceTrip(t);
      setMsg(`${v}番目の版に戻しました。3人の画面にも反映されます。`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "戻せませんでした");
    }
  };
  return (
    <div className="card stack">
      <h2>保存の履歴（共有データ）</h2>
      <p className="muted small">共有データは保存のたびにサーバーに履歴が残ります（最新200件）。間違えて消したり上書きしたりしたときは、ここから前の状態に戻せます。今の内容はこの端末に退避されます。</p>
      {!list && <button className="btn" onClick={load}>履歴を見る</button>}
      {list && list.length === 0 && <p className="muted small">まだ履歴がありません。</p>}
      {list && (
        <ul className="list history">
          {list.map((h) => (
            <li key={h.version} className="list-item">
              <div>
                <div><b>{fmtTime(Date.parse(h.savedAt))}</b> <span className="muted small">#{h.version}</span></div>
                {h.summary && (
                  <div className="muted small">
                    費用{h.summary.costs}件・予定{h.summary.itinerary}件・チャット{h.summary.messages}件・観光地の印{h.summary.spots}件
                  </div>
                )}
              </div>
              <ConfirmButton className="btn small" label="この版に戻す" confirmLabel="戻す" onConfirm={() => restore(h.version)} />
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="ok-text small">{msg}</p>}
    </div>
  );
}
