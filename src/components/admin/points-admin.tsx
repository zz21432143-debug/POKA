"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const j = (await r?.json().catch(() => null)) as { error?: string; points?: number } | null;
  return r?.ok ? { ok: true as const, points: j?.points ?? 0 } : { ok: false as const, error: j?.error ?? "처리하지 못했어요." };
}

/** 포인트 지급(+) · 회수(-) */
export function PointGrantForm({ userId, nickname }: { userId: string; nickname: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const n = Math.trunc(Number(amount));
  async function submit() {
    if (!n || !window.confirm(`${nickname}님에게 ${n > 0 ? `${n.toLocaleString()}P 지급` : `${(-n).toLocaleString()}P 회수`}할까요?\n사유: ${reason}`)) return;
    setBusy(true);
    setNote(null);
    const r = await post({ action: "grant", userId, amount: n, reason });
    setBusy(false);
    if (!r.ok) {
      setNote(r.error);
      return;
    }
    setNote(`✅ 처리했어요 · 지금 ${r.points.toLocaleString()}P`);
    setAmount("");
    setReason("");
    router.refresh();
  }
  return (
    <div data-points-grant className="grid gap-1.5 rounded-lg bg-muted/30 p-2">
      <p className="text-sm font-semibold">포인트 지급 · 회수</p>
      <div className="flex flex-wrap gap-1.5">
        {[100, 500, 1000, 3000].map((v) => (
          <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-full border border-border px-2.5 py-1 text-xs font-bold">
            +{v.toLocaleString()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))} inputMode="numeric" placeholder="예: 3000 (회수는 -500)" aria-label="포인트" className="min-h-10 w-40 rounded-lg border border-border bg-background px-2 text-sm" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(예: 이벤트 당첨 · 오류 보상)" aria-label="사유" className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm" />
        <button type="button" data-points-grant-go disabled={busy || !n || reason.trim().length < 2} onClick={() => void submit()} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "처리 중…" : n < 0 ? "회수" : "지급"}
        </button>
      </div>
      {note ? <p className="text-xs font-bold">{note}</p> : null}
    </div>
  );
}

/** 여러 명에게 한꺼번에 지급(이벤트 당첨자 등) */
export function BulkGrantForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const list = [...new Set(names.split(/[\n,]+/).map((s) => s.trim().replace(/^@/, "")).filter(Boolean))];
  const n = Math.trunc(Number(amount));
  if (!open) {
    return (
      <button type="button" data-bulk-open onClick={() => setOpen(true)} className="self-start rounded-full border border-border px-3 py-1.5 text-sm font-bold">
        👥 여러 명에게 한꺼번에 지급
      </button>
    );
  }
  async function submit() {
    if (!window.confirm(`${list.length}명에게 ${n.toLocaleString()}P씩 지급할까요?\n사유: ${reason}`)) return;
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/admin/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk", nicknames: names, amount: n, reason }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string; granted?: string[]; missing?: string[] } | null;
    setBusy(false);
    if (!r?.ok) {
      setNote(j?.error ?? "처리하지 못했어요.");
      return;
    }
    setNote(`✅ ${j?.granted?.length ?? 0}명 지급${j?.missing?.length ? ` · 못 찾은 닉네임: ${j.missing.join(", ")}` : ""}`);
    if (!j?.missing?.length) setNames("");
    router.refresh();
  }
  return (
    <section data-bulk-grant className="grid gap-1.5 rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">👥 여러 명에게 한꺼번에 지급 <span className="text-xs font-normal text-muted-foreground">(최대 100명 · 줄바꿈이나 쉼표로 구분)</span></p>
      <textarea value={names} onChange={(e) => setNames(e.target.value)} rows={4} placeholder={"닉네임1\n닉네임2, 닉네임3"} aria-label="닉네임 목록" className="rounded-lg border border-border bg-background p-2 text-sm" />
      <div className="flex flex-wrap gap-1.5">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="1인당 포인트" aria-label="1인당 포인트" className="min-h-10 w-32 rounded-lg border border-border bg-background px-2 text-sm" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(예: 10월 이벤트 당첨)" aria-label="일괄 사유" className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm" />
        <button type="button" data-bulk-go disabled={busy || !list.length || !n || reason.trim().length < 2} onClick={() => void submit()} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "처리 중…" : `${list.length}명 지급`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          닫기
        </button>
      </div>
      {note ? <p data-bulk-note className="text-xs font-bold">{note}</p> : null}
    </section>
  );
}

/** 마크 환불: 마크 회수 + 포인트 돌려줌 */
export function MarkRefundButton({ kind = "mark", userId, markId, markName, defaultAmount }: { kind?: "mark" | "cosmetic"; userId: string; markId: string; markName: string; defaultAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!open) {
    return (
      <button type="button" data-mark-refund={markId} onClick={() => setOpen(true)} className="rounded-full border border-red-400/60 px-3 py-1 text-xs font-bold text-red-400">
        환불
      </button>
    );
  }
  async function submit() {
    const n = Math.trunc(Number(amount));
    if (!window.confirm(`[${markName}] ${kind === "mark" ? "마크" : "상품"}를 회수하고 ${n.toLocaleString()}P를 돌려줄까요?`)) return;
    setBusy(true);
    setNote(null);
    const r = await post(kind === "mark" ? { action: "refund", userId, markId, amount: n, reason } : { action: "refund-cosmetic", userId, cosmeticId: markId, amount: n, reason });
    setBusy(false);
    if (!r.ok) {
      setNote(r.error);
      return;
    }
    router.refresh();
  }
  return (
    <span data-mark-refund-box className="flex w-full flex-wrap items-center gap-1.5">
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" aria-label="돌려줄 포인트" className="min-h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm" />
      <span className="text-xs">P 돌려줌</span>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(예: 잘못 구매)" aria-label="환불 사유" className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm" />
      <button type="button" data-mark-refund-go disabled={busy || reason.trim().length < 2 || amount === ""} onClick={() => void submit()} className="min-h-9 rounded-lg bg-red-500 px-3 text-xs font-bold text-white disabled:opacity-50">
        {busy ? "처리 중…" : "환불하기"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
        취소
      </button>
      {note ? <span className="w-full text-xs font-bold text-red-400">{note}</span> : null}
    </span>
  );
}
