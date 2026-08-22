import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const schema = z.object({
  url: z.string().min(1),
  caption: z.string().max(300).optional().nullable(),
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
    return NextResponse.json({ error: "写真を選択してください" }, { status: 400 });
  }

  const photo = await prisma.photo.create({
    data: {
      rabbitId: rabbit.id,
      url: parsed.data.url,
      caption: parsed.data.caption || null,
      uploadedById: user.id,
    },
  });

  return NextResponse.json({ photo });
}
