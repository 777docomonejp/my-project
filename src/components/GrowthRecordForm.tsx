"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";

export type GrowthRecordFormValues = {
  date: string;
  weightG: number | null;
  heightCm: number | null;
  note: string | null;
  photo: string | null;
};

export function GrowthRecordForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<GrowthRecordFormValues>;
  submitLabel: string;
  onSubmit: (values: GrowthRecordFormValues) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(defaultValues?.date ?? new Date().toISOString().slice(0, 10));
  const [weightG, setWeightG] = useState(defaultValues?.weightG?.toString() ?? "");
  const [heightCm, setHeightCm] = useState(defaultValues?.heightCm?.toString() ?? "");
  const [note, setNote] = useState(defaultValues?.note ?? "");
  const [photo, setPhoto] = useState<string | null>(defaultValues?.photo ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await onSubmit({
      date,
      weightG: weightG ? Number(weightG) : null,
      heightCm: heightCm ? Number(heightCm) : null,
      note: note || null,
      photo,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "保存に失敗しました");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <PhotoPicker value={photo} onChange={setPhoto} label="写真を追加" />
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-medium text-stone-600">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">体重 (g)</label>
          <input
            type="number"
            step="1"
            value={weightG}
            onChange={(e) => setWeightG(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="1200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">体長 (cm)</label>
          <input
            type="number"
            step="0.1"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="25"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">メモ</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          placeholder="元気いっぱい！"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {loading ? "保存中..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
