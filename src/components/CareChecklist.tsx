"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Field = "fed" | "watered" | "litterCleaned" | "groomed" | "playedWith";
export type CarePeriod = "am" | "pm";

const TASKS: { field: Field; label: string; icon: string }[] = [
  { field: "fed", label: "ごはん", icon: "🥕" },
  { field: "watered", label: "お水交換", icon: "💧" },
  { field: "litterCleaned", label: "トイレ掃除", icon: "🧹" },
  { field: "groomed", label: "ブラッシング", icon: "🪮" },
  { field: "playedWith", label: "遊んだ", icon: "🎾" },
];

export function CareChecklist({
  rabbitId,
  date,
  period,
  initial,
  loggedByName,
}: {
  rabbitId: string;
  date: string;
  period: CarePeriod;
  initial: Partial<Record<Field, boolean>>;
  loggedByName?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();

  async function toggle(field: Field) {
    const next = !state[field];
    setState((s) => ({ ...s, [field]: next }));
    await fetch("/api/care", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rabbitId, date, period, field, value: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TASKS.map((t) => {
          const done = !!state[t.field];
          return (
            <button
              key={t.field}
              disabled={pending}
              onClick={() => toggle(t.field)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                done
                  ? "border-orange-400 bg-orange-100 text-orange-700"
                  : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {done && <span>✓</span>}
            </button>
          );
        })}
      </div>
      {loggedByName && (
        <p className="mt-1.5 text-xs text-stone-400">最終更新: {loggedByName}</p>
      )}
    </div>
  );
}
