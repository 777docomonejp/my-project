import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/inviteCode";

const schema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  mode: z.enum(["create", "join"]),
  householdName: z.string().min(1).max(50).optional(),
  inviteCode: z.string().min(4).max(10).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const { name, email, password, mode, householdName, inviteCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
  }

  let householdId: string;

  if (mode === "create") {
    if (!householdName) {
      return NextResponse.json({ error: "家族グループ名を入力してください" }, { status: 400 });
    }
    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const clash = await prisma.household.findUnique({ where: { inviteCode: code } });
      if (!clash) break;
      code = generateInviteCode();
    }
    const household = await prisma.household.create({
      data: { name: householdName, inviteCode: code },
    });
    householdId = household.id;
  } else {
    if (!inviteCode) {
      return NextResponse.json({ error: "招待コードを入力してください" }, { status: 400 });
    }
    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });
    if (!household) {
      return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
    }
    householdId = household.id;
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed, householdId },
  });

  return NextResponse.json({ ok: true });
}
