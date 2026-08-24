import Link from "next/link";
import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatAge, formatDateJP, formatDateShort, todayDateOnly } from "@/lib/format";
import { CareDayPanel } from "@/components/CareDayPanel";

const TYPE_ICON: Record<string, string> = {
  vet: "🏥",
  grooming: "🛁",
  nail_trim: "💅",
  reminder: "⏰",
  other: "📌",
};

export default async function DashboardPage() {
  const user = await requireHouseholdUser();
  const today = todayDateOnly();
  const todayStr = today.toISOString().slice(0, 10);

  const [rabbits, todayLogs, upcomingEvents, recentPhotos, household] = await Promise.all([
    prisma.rabbit.findMany({
      where: { householdId: user.householdId! },
      orderBy: { createdAt: "asc" },
      include: {
        growthRecords: {
          where: { weightG: { not: null } },
          orderBy: { date: "desc" },
          take: 2,
        },
      },
    }),
    prisma.dailyLog.findMany({
      where: { date: today, rabbit: { householdId: user.householdId! } },
      include: { loggedBy: { select: { name: true } } },
    }),
    prisma.calendarEvent.findMany({
      where: { householdId: user.householdId!, date: { gte: today } },
      orderBy: { date: "asc" },
      take: 5,
      include: { rabbit: { select: { name: true } } },
    }),
    prisma.photo.findMany({
      where: { rabbit: { householdId: user.householdId! } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.household.findUnique({ where: { id: user.householdId! } }),
  ]);

  const amLogByRabbit = new Map(todayLogs.filter((l) => l.period === "am").map((l) => [l.rabbitId, l]));
  const pmLogByRabbit = new Map(todayLogs.filter((l) => l.period === "pm").map((l) => [l.rabbitId, l]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-stone-800">
          こんにちは、{user.name}さん 👋
        </h1>
        <p className="text-sm text-stone-500">
          {household?.name} ・ {formatDateJP(today)}
        </p>
      </div>

      {rabbits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          <p className="text-3xl">🐇</p>
          <p className="mt-2">まずはうさぎを登録しましょう！</p>
          <Link href="/rabbits/new" className="mt-3 inline-block text-orange-600 hover:underline">
            うさぎを登録する
          </Link>
        </div>
      ) : (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">🥕 今日のお世話</h2>
            <Link href="/care" className="text-xs text-orange-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-3">
            {rabbits.map((rabbit) => {
              const am = amLogByRabbit.get(rabbit.id);
              const pm = pmLogByRabbit.get(rabbit.id);
              const [latest, prev] = rabbit.growthRecords;
              const delta =
                latest?.weightG != null && prev?.weightG != null
                  ? latest.weightG - prev.weightG
                  : null;
              return (
                <div key={rabbit.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <Link href={`/rabbits/${rabbit.id}`} className="flex items-center gap-2 font-semibold text-stone-800 hover:text-orange-600">
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-orange-50">
                        {rabbit.coverPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rabbit.coverPhoto} alt="" className="h-full w-full object-cover" />
                        ) : (
                          "🐰"
                        )}
                      </span>
                      {rabbit.name}
                      <span className="text-xs font-normal text-stone-400">{formatAge(rabbit.birthDate)}</span>
                    </Link>
                    {latest?.weightG != null && (
                      <span className="text-xs text-stone-500">
                        {latest.weightG}g
                        {delta != null && (
                          <span className={delta >= 0 ? "text-green-600" : "text-red-500"}>
                            {" "}
                            ({delta >= 0 ? "+" : ""}
                            {delta}g)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <CareDayPanel
                    rabbitId={rabbit.id}
                    date={todayStr}
                    am={
                      am
                        ? {
                            fields: {
                              fed: am.fed,
                              watered: am.watered,
                              litterCleaned: am.litterCleaned,
                              groomed: am.groomed,
                              playedWith: am.playedWith,
                              timothy: am.timothy,
                              gojiBerry: am.gojiBerry,
                            },
                            loggedByName: am.loggedBy?.name,
                          }
                        : null
                    }
                    pm={
                      pm
                        ? {
                            fields: {
                              fed: pm.fed,
                              watered: pm.watered,
                              litterCleaned: pm.litterCleaned,
                              groomed: pm.groomed,
                              playedWith: pm.playedWith,
                              timothy: pm.timothy,
                              gojiBerry: pm.gojiBerry,
                            },
                            loggedByName: pm.loggedBy?.name,
                          }
                        : null
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">📅 今後の予定</h2>
            <Link href="/calendar" className="text-xs text-orange-600 hover:underline">
              カレンダーへ →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white p-4 text-center text-sm text-stone-400 shadow-sm">
              予定はありません
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                  <span className="text-lg">{TYPE_ICON[e.type] ?? "📌"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{e.title}</p>
                    <p className="text-xs text-stone-400">
                      {formatDateShort(e.date)}
                      {e.rabbit ? ` ・ ${e.rabbit.name}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">📷 最近の写真</h2>
            <Link href="/photos" className="text-xs text-orange-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          {recentPhotos.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white p-4 text-center text-sm text-stone-400 shadow-sm">
              まだ写真がありません
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentPhotos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt={p.caption ?? ""} className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
