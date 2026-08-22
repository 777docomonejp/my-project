"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EventType = "vet" | "grooming" | "nail_trim" | "reminder" | "other";

export type CalendarEventDTO = {
  id: string;
  title: string;
  date: string; // ISO
  type: EventType;
  notes: string | null;
  rabbitId: string | null;
  rabbitName: string | null;
  createdByName: string | null;
};

const TYPE_META: Record<EventType, { label: string; icon: string; dot: string }> = {
  vet: { label: "通院", icon: "🏥", dot: "bg-red-400" },
  grooming: { label: "お手入れ", icon: "🛁", dot: "bg-blue-400" },
  nail_trim: { label: "爪切り", icon: "💅", dot: "bg-purple-400" },
  reminder: { label: "リマインダー", icon: "⏰", dot: "bg-amber-400" },
  other: { label: "その他", icon: "📌", dot: "bg-stone-400" },
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({
  events,
  rabbits,
}: {
  events: CalendarEventDTO[];
  rabbits: { id: string; name: string }[];
}) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dateKey(today));
  const [showForm, setShowForm] = useState(false);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const ev of events) {
      const k = dateKey(new Date(ev.date));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const firstDay = new Date(monthCursor);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [monthCursor]);

  const selectedEvents = eventsByDay.get(selected) ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100"
        >
          ←
        </button>
        <h2 className="font-semibold text-stone-800">
          {monthCursor.getFullYear()}年 {monthCursor.getMonth() + 1}月
        </h2>
        <button
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const k = dateKey(d);
          const inMonth = d.getMonth() === monthCursor.getMonth();
          const dayEvents = eventsByDay.get(k) ?? [];
          const isToday = k === dateKey(today);
          const isSelected = k === selected;
          return (
            <button
              key={k}
              onClick={() => {
                setSelected(k);
                setShowForm(false);
              }}
              className={`flex h-14 flex-col items-center rounded-lg border p-1 text-sm transition ${
                isSelected
                  ? "border-orange-400 bg-orange-50"
                  : "border-transparent hover:bg-stone-50"
              } ${!inMonth ? "text-stone-300" : "text-stone-700"}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-orange-500 text-white" : ""}`}>
                {d.getDate()}
              </span>
              <span className="mt-0.5 flex gap-0.5">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${TYPE_META[ev.type].dot}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">{selected} の予定</h3>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
          >
            ＋ 予定を追加
          </button>
        </div>

        {showForm && (
          <EventForm
            date={selected}
            rabbits={rabbits}
            onDone={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        )}

        {selectedEvents.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">予定はありません</p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-stone-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {TYPE_META[ev.type].icon} {ev.title}
                  </p>
                  <p className="text-xs text-stone-500">
                    {[TYPE_META[ev.type].label, ev.rabbitName].filter(Boolean).join(" ・ ")}
                  </p>
                  {ev.notes && <p className="mt-1 text-xs text-stone-500">{ev.notes}</p>}
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/calendar/${ev.id}`, { method: "DELETE" });
                    router.refresh();
                  }}
                  className="shrink-0 text-xs text-stone-400 hover:text-red-500"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventForm({
  date,
  rabbits,
  onDone,
}: {
  date: string;
  rabbits: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("vet");
  const [rabbitId, setRabbitId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date,
        type,
        notes: notes || null,
        rabbitId: rabbitId || null,
      }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 space-y-2 rounded-xl bg-stone-50 p-3">
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例: 動物病院で健康診断"
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </select>
        <select
          value={rabbitId}
          onChange={(e) => setRabbitId(e.target.value)}
          className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="">うさぎを選択（任意）</option>
          {rabbits.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="メモ（任意）"
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange-500 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {loading ? "追加中..." : "追加する"}
      </button>
    </form>
  );
}
