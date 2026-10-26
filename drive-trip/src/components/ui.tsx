import { useEffect, useState, type ReactNode } from "react";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="閉じる">
            閉じる
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

/** 削除などの確認をページ内で行うボタン（confirm() はアーティファクト内で使えないため） */
export function ConfirmButton({ label, confirmLabel = "本当に削除", onConfirm, className = "btn danger" }: { label: string; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed ? (
    <button className={className + " armed"} onClick={onConfirm}>
      {confirmLabel}
    </button>
  ) : (
    <button className={className} onClick={() => setArmed(true)}>
      {label}
    </button>
  );
}

export function Badge({ kind, children }: { kind: "ok" | "est" | "warn" | "muted" | "plain"; children: ReactNode }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function numOr(v: string, d = 0): number {
  const n = Number(v.replace(/[,，円]/g, ""));
  return Number.isFinite(n) ? n : d;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
