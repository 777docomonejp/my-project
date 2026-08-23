"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";

export type RabbitFormValues = {
  name: string;
  breed: string | null;
  sex: "male" | "female" | "unknown";
  birthDate: string | null;
  notes: string | null;
  coverPhoto: string | null;
};

export function RabbitForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: Partial<RabbitFormValues>;
  submitLabel: string;
  onSubmit: (values: RabbitFormValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [breed, setBreed] = useState(defaultValues?.breed ?? "");
  const [sex, setSex] = useState<RabbitFormValues["sex"]>(defaultValues?.sex ?? "unknown");
  const [birthDate, setBirthDate] = useState(defaultValues?.birthDate ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [photo, setPhoto] = useState<string | null>(defaultValues?.coverPhoto ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await onSubmit({
      name,
      breed: breed || null,
      sex,
      birthDate: birthDate || null,
      notes: notes || null,
      coverPhoto: photo,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "保存に失敗しました");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <PhotoPicker value={photo} onChange={setPhoto} label="写真を追加" />

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">名前</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          placeholder="もこ"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">品種</label>
          <input
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            placeholder="ネザーランドドワーフ"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">性別</label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as typeof sex)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="unknown">不明</option>
            <option value="male">オス</option>
            <option value="female">メス</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">誕生日（推定でもOK）</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">メモ</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          placeholder="性格や好きな野菜など"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
      >
        {loading ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
