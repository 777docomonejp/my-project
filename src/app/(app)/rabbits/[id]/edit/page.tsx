import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { EditRabbitForm } from "@/components/EditRabbitForm";

export default async function EditRabbitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireHouseholdUser();

  const rabbit = await prisma.rabbit.findFirst({
    where: { id, householdId: user.householdId! },
  });
  if (!rabbit) notFound();

  return (
    <div className="mx-auto max-w-md">
      <Link href={`/rabbits/${rabbit.id}`} className="text-sm text-stone-500 hover:underline">
        ← {rabbit.name} のページに戻る
      </Link>
      <h1 className="mb-5 mt-2 text-xl font-bold text-stone-800">プロフィールを編集</h1>

      <EditRabbitForm
        rabbitId={rabbit.id}
        defaultValues={{
          name: rabbit.name,
          breed: rabbit.breed,
          sex: (rabbit.sex as "male" | "female" | "unknown") ?? "unknown",
          birthDate: rabbit.birthDate ? rabbit.birthDate.toISOString().slice(0, 10) : null,
          notes: rabbit.notes,
          coverPhoto: rabbit.coverPhoto,
        }}
      />
    </div>
  );
}
