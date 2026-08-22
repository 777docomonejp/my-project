import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const schema = z.object({
  title: z.string().min(1).max(100),
  date: z.string(),
  type: z.enum(["vet", "grooming", "nail_trim", "reminder", "other"]).default("other"),
  notes: z.string().max(500).optional().nullable(),
  rabbitId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const { title, date, type, notes, rabbitId } = parsed.data;

  if (rabbitId) {
    const rabbit = await prisma.rabbit.findFirst({
      where: { id: rabbitId, householdId: user.householdId! },
    });
    if (!rabbit) return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      date: new Date(date),
      type,
      notes: notes || null,
      rabbitId: rabbitId || null,
      householdId: user.householdId!,
      createdById: user.id,
    },
  });

  return NextResponse.json({ event });
}
