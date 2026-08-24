"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GrowthRecordForm, type GrowthRecordFormValues } from "@/components/GrowthRecordForm";

export function AddGrowthRecordForm({ rabbitId }: { rabbitId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: GrowthRecordFormValues) {
    const res = await fetch(`/api/rabbits/${rabbitId}/growth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "記録に失敗しました" };
    }
    setOpen(false);
    router.refresh();
    return { ok: true };
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-orange-300 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
      >
        ＋ 成長記録を追加
      </button>
    );
  }

  return (
    <GrowthRecordForm submitLabel="保存する" onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
  );
}
