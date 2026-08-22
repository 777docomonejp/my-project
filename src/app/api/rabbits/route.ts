import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const schema = z.object({
  name: z.string().min(1).max(50),
  breed: z.string().max(50).optional().nullable(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  birthDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  coverPhoto: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const { name, breed, sex, birthDate, notes, coverPhoto } = parsed.data;

  const rabbit = await prisma.rabbit.create({
    data: {
      name,
      breed: breed || null,
      sex: sex ?? "unknown",
      birthDate: birthDate ? new Date(birthDate) : null,
      notes: notes || null,
      coverPhoto: coverPhoto || null,
      householdId: user.householdId!,
    },
  });

  return NextResponse.json({ rabbit });
}
