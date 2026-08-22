import Link from "next/link";
import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatAge } from "@/lib/format";

export default async function RabbitsPage() {
  const user = await requireHouseholdUser();

  const rabbits = await prisma.rabbit.findMany({
    where: { householdId: user.householdId! },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">🐰 うさぎ一覧</h1>
        <Link
          href="/rabbits/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          ＋ 新しいうさぎ
        </Link>
      </div>

      {rabbits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          <p className="text-3xl">🐇</p>
          <p className="mt-2">まだうさぎが登録されていません。</p>
          <Link href="/rabbits/new" className="mt-3 inline-block text-orange-600 hover:underline">
            最初のうさぎを登録する
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {rabbits.map((r) => (
            <Link
              key={r.id}
              href={`/rabbits/${r.id}`}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex aspect-square items-center justify-center bg-orange-50">
                {r.coverPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverPhoto} alt={r.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl">🐰</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-stone-800 group-hover:text-orange-600">
                  {r.name}
                </p>
                <p className="text-xs text-stone-500">
                  {[r.breed, formatAge(r.birthDate)].filter(Boolean).join(" ・ ") || "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
