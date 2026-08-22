import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendarPage() {
  const user = await requireHouseholdUser();

  const [events, rabbits] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { householdId: user.householdId! },
      include: { rabbit: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.rabbit.findMany({
      where: { householdId: user.householdId! },
      select: { id: true, name: true },
    }),
  ]);

  const eventDTOs = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    type: e.type as "vet" | "grooming" | "nail_trim" | "reminder" | "other",
    notes: e.notes,
    rabbitId: e.rabbitId,
    rabbitName: e.rabbit?.name ?? null,
    createdByName: e.createdBy?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-stone-800">📅 家族カレンダー</h1>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <CalendarView events={eventDTOs} rabbits={rabbits} />
      </div>
    </div>
  );
}
