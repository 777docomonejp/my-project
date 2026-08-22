"use client";

import { useState } from "react";

export function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-5">
      <div>
        <p className="text-xs font-medium text-orange-700">招待コード</p>
        <p className="text-2xl font-bold tracking-widest text-orange-700">{code}</p>
        <p className="mt-1 text-xs text-stone-500">
          このコードを家族に共有すると、新規登録画面から参加できます。
        </p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        {copied ? "コピーしました" : "コピー"}
      </button>
    </div>
  );
}
