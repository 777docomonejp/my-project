import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const schema = z.object({
  date: z.string(),
  weightG: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  photo: z.string().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const rabbit = await prisma.rabbit.findFirst({
    where: { id, householdId: user.householdId! },
  });
  if (!rabbit) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const { date, weightG, heightCm, photo, note } = parsed.data;

  if (!weightG && !heightCm && !photo && !note) {
    return NextResponse.json(
      { error: "体重・身長・写真・メモのいずれかを入力してください" },
      { status: 400 },
    );
  }

  const record = await prisma.growthRecord.create({
    data: {
      rabbitId: rabbit.id,
      date: new Date(date),
      weightG: weightG ?? null,
      heightCm: heightCm ?? null,
      photo: photo || null,
      note: note || null,
      recordedById: user.id,
    },
  });

  if (photo) {
    await prisma.rabbit.update({ where: { id: rabbit.id }, data: { coverPhoto: photo } });
  }

  return NextResponse.json({ record });
}
