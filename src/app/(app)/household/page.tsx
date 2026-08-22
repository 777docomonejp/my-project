import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatDateJP } from "@/lib/format";
import { InviteCodeCard } from "@/components/InviteCodeCard";

export default async function HouseholdPage() {
  const user = await requireHouseholdUser();

  const household = await prisma.household.findUnique({
    where: { id: user.householdId! },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!household) return null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-stone-800">👨‍👩‍👧 {household.name}</h1>

      <InviteCodeCard code={household.inviteCode} />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">メンバー ({household.members.length}人)</h2>
        <ul className="space-y-2">
          {household.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <span className="text-2xl">{m.avatarEmoji}</span>
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {m.name} {m.id === user.id && <span className="text-xs text-orange-500">(あなた)</span>}
                </p>
                <p className="text-xs text-stone-400">{formatDateJP(m.createdAt)} に参加</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
