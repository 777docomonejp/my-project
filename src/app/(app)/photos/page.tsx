import { requireHouseholdUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatDateJP } from "@/lib/format";
import { PhotoUploadForm } from "@/components/PhotoUploadForm";

export default async function PhotosPage() {
  const user = await requireHouseholdUser();

  const rabbits = await prisma.rabbit.findMany({
    where: { householdId: user.householdId! },
    select: { id: true, name: true },
  });
  const rabbitIds = rabbits.map((r) => r.id);
  const rabbitNameById = new Map(rabbits.map((r) => [r.id, r.name]));

  const [photos, growthPhotos] = await Promise.all([
    prisma.photo.findMany({
      where: { rabbitId: { in: rabbitIds } },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.growthRecord.findMany({
      where: { rabbitId: { in: rabbitIds }, photo: { not: null } },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const items = [
    ...photos.map((p) => ({
      id: `photo-${p.id}`,
      url: p.url,
      caption: p.caption,
      date: p.createdAt,
      rabbitName: rabbitNameById.get(p.rabbitId) ?? "",
      byName: p.uploadedBy?.name ?? null,
    })),
    ...growthPhotos.map((g) => ({
      id: `growth-${g.id}`,
      url: g.photo as string,
      caption: g.note,
      date: g.date,
      rabbitName: rabbitNameById.get(g.rabbitId) ?? "",
      byName: g.recordedBy?.name ?? null,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-stone-800">📷 みんなの写真</h1>
      <PhotoUploadForm rabbits={rabbits} />

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          まだ写真がありません。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.caption ?? item.rabbitName} className="aspect-square w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs font-medium text-stone-700">
                  🐰 {item.rabbitName}
                </p>
                {item.caption && <p className="truncate text-xs text-stone-500">{item.caption}</p>}
                <p className="mt-0.5 text-[10px] text-stone-400">
                  {formatDateJP(item.date)}
                  {item.byName ? ` ・ ${item.byName}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
