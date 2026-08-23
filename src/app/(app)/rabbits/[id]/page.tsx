import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatAge, formatDateJP } from "@/lib/format";
import { GrowthChart } from "@/components/GrowthChart";
import { AddGrowthRecordForm } from "@/components/AddGrowthRecordForm";

const sexLabel: Record<string, string> = { male: "オス", female: "メス", unknown: "不明" };

export default async function RabbitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireHouseholdUser();

  const rabbit = await prisma.rabbit.findFirst({
    where: { id, householdId: user.householdId! },
    include: {
      growthRecords: {
        orderBy: { date: "desc" },
        include: { recordedBy: { select: { name: true } } },
      },
    },
  });
  if (!rabbit) notFound();

  const chartData = [...rabbit.growthRecords]
    .reverse()
    .map((r) => ({ date: r.date.toISOString(), weightG: r.weightG }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/rabbits" className="text-sm text-stone-500 hover:underline">
        ← うさぎ一覧に戻る
      </Link>

      <div className="mt-3 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50">
          {rabbit.coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rabbit.coverPhoto} alt={rabbit.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">🐰</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-stone-800">{rabbit.name}</h1>
          <p className="text-sm text-stone-500">
            {[rabbit.breed, sexLabel[rabbit.sex ?? "unknown"], formatAge(rabbit.birthDate)]
              .filter(Boolean)
              .join(" ・ ")}
          </p>
          {rabbit.birthDate && (
            <p className="text-xs text-stone-400">誕生日: {formatDateJP(rabbit.birthDate)}</p>
          )}
        </div>
        <Link
          href={`/rabbits/${rabbit.id}/edit`}
          className="ml-auto shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100"
        >
          編集
        </Link>
      </div>

      {rabbit.notes && (
        <p className="mt-3 rounded-xl bg-white p-3 text-sm text-stone-600 shadow-sm">
          📝 {rabbit.notes}
        </p>
      )}

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">📈 成長グラフ</h2>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <GrowthChart data={chartData} />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">成長記録</h2>
        <div className="space-y-3">
          <AddGrowthRecordForm rabbitId={rabbit.id} />

          {rabbit.growthRecords.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-center text-sm text-stone-400 shadow-sm">
              まだ記録がありません。
            </p>
          ) : (
            rabbit.growthRecords.map((record) => (
              <div
                key={record.id}
                className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
              >
                {record.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.photo}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone-400">{formatDateJP(record.date)}</p>
                  <p className="text-sm font-medium text-stone-800">
                    {[
                      record.weightG != null ? `${record.weightG} g` : null,
                      record.heightCm != null ? `${record.heightCm} cm` : null,
                    ]
                      .filter(Boolean)
                      .join(" ・ ") || "写真のみ"}
                  </p>
                  {record.note && <p className="text-sm text-stone-600">{record.note}</p>}
                  {record.recordedBy && (
                    <p className="text-xs text-stone-400">記録者: {record.recordedBy.name}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
