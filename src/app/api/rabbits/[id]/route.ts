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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.rabbit.findFirst({
    where: { id, householdId: user.householdId! },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const { name, breed, sex, birthDate, notes, coverPhoto } = parsed.data;

  const rabbit = await prisma.rabbit.update({
    where: { id: existing.id },
    data: {
      name,
      breed: breed || null,
      sex: sex ?? "unknown",
      birthDate: birthDate ? new Date(birthDate) : null,
      notes: notes || null,
      coverPhoto: coverPhoto || null,
    },
  });

  return NextResponse.json({ rabbit });
}
