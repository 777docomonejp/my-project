import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** For use inside API route handlers. Returns the user (with household) or null. */
export async function requireApiUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { household: true },
  });
  if (!user?.householdId) return null;
  return user;
}
