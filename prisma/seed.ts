import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateInviteCode } from "../src/lib/inviteCode";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const household = await prisma.household.create({
    data: { name: "サンプル家族", inviteCode: generateInviteCode() },
  });

  const mama = await prisma.user.create({
    data: { name: "ママ", email: "mama@example.com", password, avatarEmoji: "🐰", householdId: household.id },
  });
  await prisma.user.create({
    data: { name: "パパ", email: "papa@example.com", password, avatarEmoji: "🥕", householdId: household.id },
  });

  const rabbit = await prisma.rabbit.create({
    data: {
      name: "もち",
      breed: "ホーランドロップ",
      sex: "female",
      birthDate: new Date("2025-03-10"),
      notes: "人参が大好き。抱っこは苦手。",
      householdId: household.id,
    },
  });

  const weights = [
    ["2025-04-01", 150],
    ["2025-05-01", 350],
    ["2025-06-01", 700],
    ["2025-07-01", 1050],
    ["2025-08-01", 1400],
  ] as const;
  for (const [date, weightG] of weights) {
    await prisma.growthRecord.create({
      data: { rabbitId: rabbit.id, date: new Date(date), weightG, recordedById: mama.id },
    });
  }

  await prisma.calendarEvent.create({
    data: {
      title: "ワクチン接種",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      type: "vet",
      householdId: household.id,
      rabbitId: rabbit.id,
      createdById: mama.id,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyLog.create({
    data: {
      rabbitId: rabbit.id,
      date: today,
      fed: true,
      fedAt: new Date(),
      watered: true,
      wateredAt: new Date(),
      loggedById: mama.id,
    },
  });

  console.log("Seeded! Login with mama@example.com / password123");
  console.log("Invite code:", household.inviteCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
