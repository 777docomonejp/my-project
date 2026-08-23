"use client";

import { useRouter } from "next/navigation";
import { RabbitForm, type RabbitFormValues } from "@/components/RabbitForm";

export function EditRabbitForm({
  rabbitId,
  defaultValues,
}: {
  rabbitId: string;
  defaultValues: Partial<RabbitFormValues>;
}) {
  const router = useRouter();

  async function handleSubmit(values: RabbitFormValues) {
    const res = await fetch(`/api/rabbits/${rabbitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) return { ok: false, error: "更新に失敗しました" };
    router.push(`/rabbits/${rabbitId}`);
    router.refresh();
    return { ok: true };
  }

  return <RabbitForm defaultValues={defaultValues} submitLabel="変更を保存" onSubmit={handleSubmit} />;
}
