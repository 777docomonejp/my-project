import { useMemo, useRef, useState } from "react";
import { createDefaultTrip, mergeTrips, newId, normalizeTrip } from "../lib/trip";
import { decodeShare, encodeShare, generatePassphrase } from "../lib/share";
import { fmtTime, type Store } from "../state";
import type { Trip } from "../types";
import { tallyVotes, VoteButtons } from "./SpotDetail";
import { ConfirmButton, Field, copyText } from "./ui";

export function ShareTab({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const [section, setSection] = useState<"chat" | "vote" | "sync" | "backup">("chat");
  return (
    <div className="stack">
      <div className="seg wide" role="tablist">
        {([["chat", "チャット"], ["vote", "投票"], ["sync", "同期"], ["backup", "バックアップ"]] as const).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={section === k} className={section === k ? "on" : ""} onClick={() => setSection(k)}>{v}</button>
        ))}
      </div>
      {section === "chat" && <Chat s={s} onOpenSpot={onOpenSpot} />}
      {section === "vote" && <Votes s={s} onOpenSpot={onOpenSpot} />}
      {section === "sync" && <Sync s={s} />}
      {section === "backup" && <Backup s={s} />}
    </div>
  );
}

function Chat({ s, onOpenSpot }: { s: Store; onOpenSpot: (id: string) => void }) {
  const [text, setText] = useState("");
  const msgs = useMemo(() => [...s.trip.messages].sort((a, b) => a.createdAt - b.createdAt), [s.trip.messages]);
  return (
    <section className="stack">
      <p className="muted small">メッセージはこの端末に保存され、「同期」で他のメンバーに届きます（リアルタイム配信ではありません）。</p>
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

function Sync({ s }: { s: Store }) {
  const [pass, setPass] = useState(s.pass);
  const [code, setCode] = useState("");
  const [incoming, setIncoming] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Trip | null>(null);
  const out = useRef<HTMLTextAreaElement>(null);

  const make = async () => {
    setBusy(true);
    setMsg(null);
    try {
      s.setPass(pass.trim());
      const c = await encodeShare(s.trip, pass.trim());
      setCode(c);
      const copied = await copyText(c);
      setMsg({ kind: "ok", text: copied ? "共有コードを作ってコピーしました。LINE等に貼り付けて送ってください。" : "共有コードを作りました。下の欄を長押しして全選択→コピーしてください。" });
      if (!copied) setTimeout(() => out.current?.select(), 50);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "作成に失敗しました" });
    } finally {
      setBusy(false);
    }
  };

  const load = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const other = await decodeShare(incoming, pass.trim());
      s.setPass(pass.trim());
      if (other.tripId === s.trip.tripId) {
        s.setTrip((t) => mergeTrips(t, other));
        setIncoming("");
        setMsg({ kind: "ok", text: "取り込みました。両方の変更を合わせました（同じ項目は新しい方を採用）。" });
      } else {
        setPending(other);
      }
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "読み込みに失敗しました" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stack">
      <div className="card stack">
        <h2>仕組み</h2>
        <ol className="steps">
          <li>1人が「合言葉」を作り、3人にだけ伝えます（LINEなど）。</li>
          <li>変更した人が「共有コードを作る」→コードを送ります。</li>
          <li>受け取った人は「コードを取り込む」に貼り付けます。両方の変更が合わさります。</li>
        </ol>
        <p className="muted small">コードは合言葉で暗号化されているので、コードだけが他人に見られても中身は読めません。サーバーは使わないため登録・料金は不要ですが、自動では同期されません。</p>
      </div>
      <Field label="合言葉（8文字以上・3人で同じもの）">
        <div className="row">
          <input id="sync-pass" className="grow" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
          <button type="button" className="btn small" onClick={() => setPass(generatePassphrase())}>自動作成</button>
        </div>
      </Field>
      <div className="card stack">
        <h3>送る</h3>
        <button className="btn primary" disabled={busy || pass.trim().length < 8} onClick={make}>共有コードを作る</button>
        {code && <textarea id="sync-out" ref={out} readOnly rows={4} value={code} onFocus={(e) => e.currentTarget.select()} />}
      </div>
      <div className="card stack">
        <h3>受け取る</h3>
        <textarea id="sync-in" rows={4} value={incoming} onChange={(e) => setIncoming(e.target.value)} placeholder="DT1. で始まるコードを貼り付け" />
        <button className="btn primary" disabled={busy || !incoming.trim() || pass.trim().length < 8} onClick={load}>コードを取り込む</button>
      </div>
      {pending && (
        <div className="alert warn stack">
          <span>このコードは別の旅行（{pending.meta.title}）のものです。参加すると、この端末の今のデータは置き換わります。</span>
          <div className="row">
            <button className="btn primary" onClick={() => { s.setTrip(pending); setPending(null); setIncoming(""); setMsg({ kind: "ok", text: "旅行に参加しました。ホームで自分の名前を選んでください。" }); }}>この旅行に参加する</button>
            <button className="btn" onClick={() => setPending(null)}>やめる</button>
          </div>
        </div>
      )}
      {msg && <div className={`alert ${msg.kind === "ok" ? "ok" : "warn"}`} role="status">{msg.text}</div>}
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
      <div className="card stack">
        <h2>初期状態に戻す</h2>
        <p className="muted small">この端末のデータを全て消して初期データに戻します。先にバックアップを取ってください。</p>
        <ConfirmButton label="全データを消去" confirmLabel="もう一度押すと消去" onConfirm={() => { s.setTrip(createDefaultTrip()); setMsg("初期状態に戻しました。"); }} />
      </div>
      {!s.storageOk && <div className="alert warn">この端末ではブラウザ保存が使えません。ページを閉じるとデータが消えます。</div>}
    </section>
  );
}
