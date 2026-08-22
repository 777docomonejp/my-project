"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhotoPicker } from "@/components/PhotoPicker";

export default function NewRabbitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "unknown">("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/rabbits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        breed: breed || null,
        sex,
        birthDate: birthDate || null,
        notes: notes || null,
        coverPhoto: photo,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("登録に失敗しました");
      return;
    }
    const { rabbit } = await res.json();
    router.push(`/rabbits/${rabbit.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href="/rabbits" className="text-sm text-stone-500 hover:underline">
        ← うさぎ一覧に戻る
      </Link>
      <h1 className="mb-5 mt-2 text-xl font-bold text-stone-800">新しいうさぎを登録</h1>

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
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  );
}
