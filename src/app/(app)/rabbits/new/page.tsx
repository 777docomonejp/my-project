"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RabbitForm, type RabbitFormValues } from "@/components/RabbitForm";

export default function NewRabbitPage() {
  const router = useRouter();

  async function handleSubmit(values: RabbitFormValues) {
    const res = await fetch("/api/rabbits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) return { ok: false, error: "登録に失敗しました" };
    const { rabbit } = await res.json();
    router.push(`/rabbits/${rabbit.id}`);
    router.refresh();
    return { ok: true };
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href="/rabbits" className="text-sm text-stone-500 hover:underline">
        ← うさぎ一覧に戻る
      </Link>
      <h1 className="mb-5 mt-2 text-xl font-bold text-stone-800">新しいうさぎを登録</h1>

      <RabbitForm submitLabel="登録する" onSubmit={handleSubmit} />
    </div>
  );
}
