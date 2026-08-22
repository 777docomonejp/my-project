"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoPicker } from "@/components/PhotoPicker";

export function PhotoUploadForm({ rabbits }: { rabbits: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rabbitId, setRabbitId] = useState(rabbits[0]?.id ?? "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError("写真を選択してください");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/rabbits/${rabbitId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: photo, caption: caption || null }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("アップロードに失敗しました");
      return;
    }
    setPhoto(null);
    setCaption("");
    setOpen(false);
    router.refresh();
  }

  if (rabbits.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        ＋ 写真を共有する
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <PhotoPicker value={photo} onChange={setPhoto} />
      <select
        value={rabbitId}
        onChange={(e) => setRabbitId(e.target.value)}
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      >
        {rabbits.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="ひとこと（任意）"
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {loading ? "共有中..." : "共有する"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
