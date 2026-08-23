"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        mode,
        householdName: mode === "create" ? householdName : undefined,
        inviteCode: mode === "join" ? inviteCode : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "登録に失敗しました");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl">🐰</div>
          <h1 className="mt-2 text-2xl font-bold text-stone-800">らてのきろく</h1>
          <p className="mt-1 text-sm text-stone-500">新しいアカウントを作成</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`rounded-md py-1.5 transition ${mode === "create" ? "bg-white shadow-sm text-orange-600" : "text-stone-500"}`}
            >
              家族グループを作る
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`rounded-md py-1.5 transition ${mode === "join" ? "bg-white shadow-sm text-orange-600" : "text-stone-500"}`}
            >
              招待コードで参加
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">お名前</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="ママ / パパ / さくら など"
            />
          </div>

          {mode === "create" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">家族グループ名</label>
              <input
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="例: 田中家"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">招待コード</label>
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="例: AB12CD"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">パスワード（6文字以上）</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "作成中..." : "登録する"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-orange-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
