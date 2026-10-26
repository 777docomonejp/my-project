import type { CostItem, Leg, Member } from "../types";

/** ガソリン代 = 距離 / 燃費 × 単価（円未満四捨五入）。不正値は 0。 */
export function fuelCost(distanceKm?: number, kmPerL?: number, yenPerL?: number): number {
  if (!isPos(distanceKm) || !isPos(kmPerL) || !isPos(yenPerL)) return 0;
  return Math.round((distanceKm / kmPerL) * yenPerL);
}

function isPos(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function itemAmount(item: CostItem): number {
  if (item.category === "fuel") return fuelCost(item.distanceKm, item.kmPerL, item.yenPerL);
  return Number.isFinite(item.amount) && item.amount > 0 ? Math.round(item.amount) : 0;
}

/** 負担者（空なら全員、存在しないメンバーは除外） */
export function participants(item: CostItem, members: Member[]): string[] {
  const ids = members.map((m) => m.id);
  const chosen = item.splitAmong.filter((id) => ids.includes(id));
  return chosen.length ? chosen : ids;
}

/** 金額を人数で割る。端数の1円はリスト先頭の人から順に負担する（合計が必ず一致する）。 */
export function splitYen(amount: number, ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const base = Math.floor(amount / ids.length);
  let rest = amount - base * ids.length;
  for (const id of ids) {
    out[id] = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest--;
  }
  return out;
}

export interface PersonBalance {
  memberId: string;
  paid: number; // 立て替えた額
  owed: number; // 本来の負担額
  balance: number; // paid - owed（プラスなら受け取る側）
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface CostSummary {
  total: number;
  estimateTotal: number;
  confirmedTotal: number;
  byLeg: Record<Leg, number>;
  perPerson: PersonBalance[];
  transfers: Transfer[];
  /** 支払者が未設定・不明な費用 */
  unassigned: number;
}

export function summarize(items: CostItem[], members: Member[]): CostSummary {
  const byLeg: Record<Leg, number> = { outbound: 0, return: 0, local: 0, other: 0 };
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  for (const m of members) {
    paid[m.id] = 0;
    owed[m.id] = 0;
  }
  let total = 0;
  let estimateTotal = 0;
  let confirmedTotal = 0;
  let unassigned = 0;

  for (const item of items) {
    const amt = itemAmount(item);
    if (!amt) continue;
    total += amt;
    if (item.confirmed) confirmedTotal += amt;
    else estimateTotal += amt;
    byLeg[item.leg] = (byLeg[item.leg] ?? 0) + amt;
    const shares = splitYen(amt, participants(item, members));
    for (const [id, v] of Object.entries(shares)) owed[id] += v;
    if (item.payerId in paid) paid[item.payerId] += amt;
    else unassigned += amt;
  }

  const perPerson = members.map((m) => ({
    memberId: m.id,
    paid: paid[m.id],
    owed: owed[m.id],
    balance: paid[m.id] - owed[m.id],
  }));
  return { total, estimateTotal, confirmedTotal, byLeg, perPerson, transfers: settle(perPerson), unassigned };
}

/** 精算：払いすぎの人へ、払い足りない人が送金する最小に近い組み合わせ（貪欲法）。 */
export function settle(balances: Pick<PersonBalance, "memberId" | "balance">[]): Transfer[] {
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.memberId, v: -b.balance }));
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.memberId, v: b.balance }));
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].v, creditors[j].v);
    if (x > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: x });
    debtors[i].v -= x;
    creditors[j].v -= x;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

export const yen = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
