import { requireHouseholdUser } from "@/lib/currentUser";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHouseholdUser();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar userName={user.name} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
