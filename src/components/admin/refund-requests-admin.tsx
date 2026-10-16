"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Req = { id: string; at: string; nickname: string | null; userId: string; kind: "mark" | "cosmetic"; name: string; reason: string };

/** 운영자: 회원 환불 요청 승인(바로 환불 · 산 값 그대로) · 거절 */
export function RefundRequestsAdmin({ requests }: { requests: Req[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  async function act(id: string, approve: boolean) {
    if (approve && !window.confirm("승인하면 바로 회수 · 환불돼요. 진행할까요?")) return;
    setBusy(id);
    setMsg(null);
    const r = await fetch("/api/admin/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", requestId: id, approve, note: notes[id] ?? "" }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string; refunded?: number } | null;
    setBusy(null);
    if (!r?.ok) {
      setMsg(j?.error ?? "처리하지 못했어요.");
      return;
    }
    setMsg(approve ? `✅ 환불했어요 · ${(j?.refunded ?? 0).toLocaleString()}P` : "거절했어요.");
    router.refresh();
  }
  return (
    <section data-refund-requests className="grid gap-2 rounded-xl border border-amber-500/50 bg-card p-3">
      <p className="text-sm font-semibold">🔁 회원 환불 요청 {requests.length}건</p>
      <ul className="grid gap-1.5">
        {requests.map((r) => (
          <li key={r.id} data-refund-req={r.id} className="grid gap-1.5 rounded-lg border border-border p-2 text-sm">
            <span>
              <b>{r.nickname ?? "(탈퇴)"}</b> · [{r.name}]{" "}
              <span className="text-xs text-muted-foreground">
                {r.kind === "mark" ? "마크" : "프레임 · 이펙트"} · {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(r.at))}
              </span>
              <span className="block text-xs">사유: {r.reason}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <input value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="회원에게 남길 말(선택)" aria-label="남길 말" className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs" />
              <button type="button" data-refund-approve={r.id} disabled={busy === r.id} onClick={() => void act(r.id, true)} className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                승인 · 환불
              </button>
              <button type="button" data-refund-reject={r.id} disabled={busy === r.id} onClick={() => void act(r.id, false)} className="min-h-9 rounded-lg border border-red-400/60 px-3 text-xs font-bold text-red-400 disabled:opacity-50">
                거절
              </button>
              <a href={`/admin/points?q=${encodeURIComponent(r.nickname ?? "")}&u=${r.userId}`} className="self-center text-xs underline">
                회원 보기
              </a>
            </div>
          </li>
        ))}
      </ul>
      {msg ? <p className="text-xs font-bold">{msg}</p> : null}
    </section>
  );
}
