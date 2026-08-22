"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "ホーム", icon: "🏠" },
  { href: "/rabbits", label: "うさぎ", icon: "🐰" },
  { href: "/care", label: "お世話", icon: "🥕" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/photos", label: "写真", icon: "📷" },
  { href: "/household", label: "家族", icon: "👨‍👩‍👧" },
];

export function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-stone-800">
            <span className="text-xl">🐰</span>
            <span>うさぎのきろく</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => {
              const active = pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-orange-100 text-orange-700" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {l.icon} {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 sm:inline">{userName} さん</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <nav className="sticky bottom-0 z-20 flex justify-around border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden">
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? "text-orange-600" : "text-stone-500"
              }`}
            >
              <span className="text-lg">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
