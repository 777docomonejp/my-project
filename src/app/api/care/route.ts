import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { toDateOnly, isGojiBerryDay } from "@/lib/format";

const FIELDS = ["fed", "watered", "litterCleaned", "groomed", "playedWith", "timothy", "gojiBerry"] as const;
const TIMESTAMP_FIELD: Partial<Record<(typeof FIELDS)[number], string>> = {
  fed: "fedAt",
  watered: "wateredAt",
  litterCleaned: "litterCleanedAt",
};

const schema = z.object({
  rabbitId: z.string(),
  date: z.string(), // yyyy-mm-dd
  period: z.enum(["am", "pm"]),
  field: z.enum(FIELDS),
  value: z.boolean(),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { rabbitId, date, period, field, value } = parsed.data;

  if (field === "gojiBerry" && value && !isGojiBerryDay(date)) {
    return NextResponse.json({ error: "クコの実は月・水・金のみ記録できます" }, { status: 400 });
  }

  const rabbit = await prisma.rabbit.findFirst({
    where: { id: rabbitId, householdId: user.householdId! },
  });
  if (!rabbit) return NextResponse.json({ error: "not found" }, { status: 404 });

  const day = toDateOnly(new Date(date));
  const timestampField = TIMESTAMP_FIELD[field];

  const data: Record<string, unknown> = {
    [field]: value,
    loggedById: user.id,
  };
  if (timestampField) {
    data[timestampField] = value ? new Date() : null;
  }

  const log = await prisma.dailyLog.upsert({
    where: { rabbitId_date_period: { rabbitId, date: day, period } },
    update: data,
    create: { rabbitId, date: day, period, ...data },
  });

  return NextResponse.json({ log });
}
