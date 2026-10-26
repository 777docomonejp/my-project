import { useMemo, useState } from "react";
import { CATEGORY_LABEL, LEG_LABEL, type CostCategory, type CostItem, type Leg } from "../types";
import { newId } from "../lib/trip";
import { fuelCost, itemAmount, participants, summarize, yen } from "../lib/cost";
import type { Store } from "../state";
import { Badge, ConfirmButton, Field, Sheet, numOr } from "./ui";

const LEGS: Leg[] = ["outbound", "return", "local", "other"];

export function CostTab({ s }: { s: Store }) {
  const [edit, setEdit] = useState<CostItem | null>(null);
  const sum = useMemo(() => summarize(s.trip.costs, s.trip.members), [s.trip.costs, s.trip.members]);
  const n = s.trip.members.length;

  return (
    <div className="stack">
      <section className="card total-card">
        <div className="total">
          <span className="tile-label">合計</span>
          <span className="tile-num">{yen(sum.total)}</span>
          <span className="small">
            1人あたり平均 <b>{n ? yen(sum.total / n) : "—"}</b>
          </span>
        </div>
        <div className="row wrap">
          <Badge kind="ok">確認済み {yen(sum.confirmedTotal)}</Badge>
          <Badge kind="est">概算 {yen(sum.estimateTotal)}</Badge>
        </div>
        <p className="muted small">概算を含む金額は確定値ではありません。高速料金・ガソリン単価は出発前に実際の値へ更新してください。</p>
        <table className="tbl">
          <tbody>
            {LEGS.map((l) => (
              <tr key={l}>
                <th>{LEG_LABEL[l]}</th>
                <td>{yen(sum.byLeg[l])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>1人あたりの負担額</h2>
        <table className="tbl">
          <tbody>
            {sum.perPerson.map((p) => (
              <tr key={p.memberId}>
                <th>{s.memberName(p.memberId)}</th>
                <td>{yen(p.owed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="row-between">
        <h2>費用の明細</h2>
        <button
          className="btn primary small"
          onClick={() => setEdit({ id: newId(), updatedAt: 0, category: "food", leg: "local", label: "", amount: 0, confirmed: true, payerId: s.me || s.trip.members[0]?.id || "", splitAmong: [], note: "" })}
        >
          ＋費用を追加
        </button>
      </div>
      {LEGS.map((l) => {
        const items = s.trip.costs.filter((c) => c.leg === l);
        if (!items.length) return null;
        return (
          <section key={l}>
            <h3 className="day-head">{LEG_LABEL[l]}</h3>
            <ul className="list">
              {items.map((c) => (
                <li key={c.id} className="list-item" role="button" tabIndex={0} onClick={() => setEdit(c)} onKeyDown={(e) => e.key === "Enter" && setEdit(c)}>
                  <div>
                    <div>{c.label || CATEGORY_LABEL[c.category]}</div>
                    <div className="muted small">
                      {CATEGORY_LABEL[c.category]}・{participants(c, s.trip.members).length}人で割る
                      {c.category === "fuel" && ` ・${c.distanceKm ?? 0}km ÷ ${c.kmPerL ?? 0}km/L × ${c.yenPerL ?? 0}円`}
                    </div>
                  </div>
                  <div className="right">
                    <div className="num">{itemAmount(c) ? yen(itemAmount(c)) : "未入力"}</div>
                    <Badge kind={c.confirmed ? "ok" : "est"}>{c.confirmed ? "確認済み" : "概算"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="muted small">
        高速料金の目安は NEXCO の「ドラぷら」(driveplaza.com) などで、出発・到着ICと車種（普通車）・ETC割引を指定して調べられます。調べた料金は「確認済み」ではなく「概算」として入れ、実際の利用明細で確定させるのがおすすめです。
      </p>
      {edit && (
        <CostSheet
          s={s}
          item={edit}
          isNew={!s.trip.costs.some((c) => c.id === edit.id)}
          onClose={() => setEdit(null)}
          onSave={(c) => { s.put("costs", c); setEdit(null); }}
          onDelete={() => { s.del("costs", edit.id); setEdit(null); }}
        />
      )}
    </div>
  );
}

function CostSheet({ s, item, isNew, onSave, onDelete, onClose }: { s: Store; item: CostItem; isNew: boolean; onSave: (c: CostItem) => void; onDelete: () => void; onClose: () => void }) {
  const [c, setC] = useState(item);
  const isFuel = c.category === "fuel";
  const toggle = (id: string) => {
    const all = s.trip.members.map((m) => m.id);
    const cur = c.splitAmong.length ? c.splitAmong : all;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setC({ ...c, splitAmong: next.length === all.length ? [] : next });
  };
  const split = participants(c, s.trip.members);
  return (
    <Sheet title={isNew ? "費用を追加" : "費用を編集"} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (split.length) onSave(c); }}>
        <div className="grid2">
          <Field label="種類">
            <select id="c-cat" value={c.category} onChange={(e) => setC({ ...c, category: e.target.value as CostCategory })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="区分">
            <select id="c-leg" value={c.leg} onChange={(e) => setC({ ...c, leg: e.target.value as Leg })}>
              {LEGS.map((l) => <option key={l} value={l}>{LEG_LABEL[l]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="内容"><input id="c-label" value={c.label} onChange={(e) => setC({ ...c, label: e.target.value })} placeholder="例：海ほたるで昼ごはん" /></Field>
        {isFuel ? (
          <>
            <div className="grid3">
              <Field label="走行距離 km"><input id="c-km" inputMode="decimal" value={c.distanceKm ?? ""} onChange={(e) => setC({ ...c, distanceKm: numOr(e.target.value) })} /></Field>
              <Field label="燃費 km/L"><input id="c-kml" inputMode="decimal" value={c.kmPerL ?? ""} onChange={(e) => setC({ ...c, kmPerL: numOr(e.target.value) })} /></Field>
              <Field label="単価 円/L"><input id="c-yen" inputMode="decimal" value={c.yenPerL ?? ""} onChange={(e) => setC({ ...c, yenPerL: numOr(e.target.value) })} /></Field>
            </div>
            <p className="calc">= {yen(fuelCost(c.distanceKm, c.kmPerL, c.yenPerL))}</p>
          </>
        ) : (
          <Field label="金額（円）"><input id="c-amount" inputMode="numeric" value={c.amount || ""} onChange={(e) => setC({ ...c, amount: numOr(e.target.value) })} /></Field>
        )}
        <Field label="料金の確からしさ">
          <select id="c-conf" value={c.confirmed ? "1" : "0"} onChange={(e) => setC({ ...c, confirmed: e.target.value === "1" })}>
            <option value="0">概算（目安・未確認）</option>
            <option value="1">確認済み（レシート・明細あり）</option>
          </select>
        </Field>
        <fieldset className="field">
          <legend className="field-label">負担する人（{split.length}人で割る）</legend>
          <div className="chips">
            {s.trip.members.map((m) => (
              <button type="button" key={m.id} className={`chip ${split.includes(m.id) ? "on" : ""}`} onClick={() => toggle(m.id)}>{m.name}</button>
            ))}
          </div>
          {split.length > 0 && <span className="hint">1人あたり 約{yen(itemAmount(c) / split.length)}</span>}
        </fieldset>
        <Field label="メモ・根拠"><textarea id="c-note" rows={2} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} /></Field>
        <div className="row">
          <button className="btn primary" type="submit">保存</button>
          {!isNew && <ConfirmButton label="削除" onConfirm={onDelete} />}
        </div>
      </form>
    </Sheet>
  );
}
