"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateJP } from "@/lib/format";
import { GrowthRecordForm, type GrowthRecordFormValues } from "@/components/GrowthRecordForm";

export function GrowthRecordItem({
  rabbitId,
  record,
}: {
  rabbitId: string;
  record: {
    id: string;
    date: string; // ISO
    weightG: number | null;
    heightCm: number | null;
    photo: string | null;
    note: string | null;
    recordedByName: string | null;
  };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function handleSubmit(values: GrowthRecordFormValues) {
    const res = await fetch(`/api/rabbits/${rabbitId}/growth/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "更新に失敗しました" };
    }
    setEditing(false);
    router.refresh();
    return { ok: true };
  }

  if (editing) {
    return (
      <GrowthRecordForm
        submitLabel="変更を保存"
        onCancel={() => setEditing(false)}
        onSubmit={handleSubmit}
        defaultValues={{
          date: record.date.slice(0, 10),
          weightG: record.weightG,
          heightCm: record.heightCm,
          note: record.note,
          photo: record.photo,
        }}
      />
    );
  }

  return (
    <div className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      {record.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={record.photo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-stone-400">{formatDateJP(record.date)}</p>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs text-stone-400 hover:text-orange-600"
          >
            編集
          </button>
        </div>
        <p className="text-sm font-medium text-stone-800">
          {[
            record.weightG != null ? `${record.weightG} g` : null,
            record.heightCm != null ? `${record.heightCm} cm` : null,
          ]
            .filter(Boolean)
            .join(" ・ ") || "写真のみ"}
        </p>
        {record.note && <p className="text-sm text-stone-600">{record.note}</p>}
        {record.recordedByName && (
          <p className="text-xs text-stone-400">記録者: {record.recordedByName}</p>
        )}
      </div>
    </div>
  );
}
