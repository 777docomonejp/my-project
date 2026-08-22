import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { household: true },
  });
  return user;
}

/** Requires a logged-in user who belongs to a household; redirects otherwise. */
export async function requireHouseholdUser() {
  const user = await getCurrentUser();
  if (!user || !user.householdId || !user.household) redirect("/login");
  return user;
}
