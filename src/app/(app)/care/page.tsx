import Link from "next/link";
import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { toDateOnly, formatDateShort } from "@/lib/format";
import { CareDayPanel } from "@/components/CareDayPanel";

const HISTORY_DAYS = 7;
const TASK_COUNT_PER_PERIOD = 5;

export default async function CarePage() {
  const user = await requireHouseholdUser();

  const rabbits = await prisma.rabbit.findMany({
    where: { householdId: user.householdId! },
    orderBy: { createdAt: "asc" },
  });

  const today = toDateOnly(new Date());
  const historyStart = new Date(today);
  historyStart.setDate(historyStart.getDate() - (HISTORY_DAYS - 1));

  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const d = new Date(historyStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const logs = await prisma.dailyLog.findMany({
    where: {
      rabbitId: { in: rabbits.map((r) => r.id) },
      date: { gte: historyStart, lte: today },
    },
    include: { loggedBy: { select: { name: true } } },
  });

  const logMap = new Map(logs.map((l) => [`${l.rabbitId}_${l.date.toISOString()}_${l.period}`, l]));
  const todayStr = today.toISOString().slice(0, 10);

  if (rabbits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
        <p className="text-3xl">🐇</p>
        <p className="mt-2">まずはうさぎを登録してください。</p>
        <Link href="/rabbits/new" className="mt-3 inline-block text-orange-600 hover:underline">
          うさぎを登録する
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-stone-800">🥕 今日のお世話</h1>

      {rabbits.map((rabbit) => {
        const todayAm = logMap.get(`${rabbit.id}_${today.toISOString()}_am`);
        const todayPm = logMap.get(`${rabbit.id}_${today.toISOString()}_pm`);
        return (
          <section key={rabbit.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">🐰</span>
              <Link href={`/rabbits/${rabbit.id}`} className="font-semibold text-stone-800 hover:text-orange-600">
                {rabbit.name}
              </Link>
            </div>

            <CareDayPanel
              rabbitId={rabbit.id}
              date={todayStr}
              am={
                todayAm
                  ? {
                      fields: {
                        fed: todayAm.fed,
                        watered: todayAm.watered,
                        litterCleaned: todayAm.litterCleaned,
                        groomed: todayAm.groomed,
                        playedWith: todayAm.playedWith,
                      },
                      loggedByName: todayAm.loggedBy?.name,
                    }
                  : null
              }
              pm={
                todayPm
                  ? {
                      fields: {
                        fed: todayPm.fed,
                        watered: todayPm.watered,
                        litterCleaned: todayPm.litterCleaned,
                        groomed: todayPm.groomed,
                        playedWith: todayPm.playedWith,
                      },
                      loggedByName: todayPm.loggedBy?.name,
                    }
                  : null
              }
            />

            <div className="mt-4 border-t border-stone-100 pt-3">
              <p className="mb-2 text-xs font-medium text-stone-500">過去{HISTORY_DAYS}日間（朝＋夜）</p>
              <div className="flex gap-2">
                {days.map((d) => {
                  const am = logMap.get(`${rabbit.id}_${d.toISOString()}_am`);
                  const pm = logMap.get(`${rabbit.id}_${d.toISOString()}_pm`);
                  const countFor = (log: typeof am) =>
                    log ? [log.fed, log.watered, log.litterCleaned, log.groomed, log.playedWith].filter(Boolean).length : 0;
                  const doneCount = countFor(am) + countFor(pm);
                  const maxCount = TASK_COUNT_PER_PERIOD * 2;
                  const isToday = d.getTime() === today.getTime();
                  return (
                    <div key={d.toISOString()} className="flex flex-col items-center gap-1">
                      <div
                        title={`${doneCount}/${maxCount} 完了`}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                          doneCount === 0
                            ? "bg-stone-100 text-stone-300"
                            : doneCount < maxCount / 2
                              ? "bg-orange-100 text-orange-500"
                              : "bg-orange-400 text-white"
                        } ${isToday ? "ring-2 ring-orange-400" : ""}`}
                      >
                        {doneCount > 0 ? doneCount : ""}
                      </div>
                      <span className="text-[10px] text-stone-400">{formatDateShort(d)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
