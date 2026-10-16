"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { kind: "mark" | "cosmetic"; itemId: string; name: string; at: string };
type Req = { id: string; at: string; name: string; reason: string; status: "pending" | "approved" | "rejected"; note?: string };

const STATUS = { pending: "확인 중", approved: "환불됨", rejected: "거절" } as const;

/** 내 프로필: 최근 7일 안에 산 마크 · 프레임 · 이펙트 환불 요청 + 내 요청 결과 */
export function RefundRequestBox({ items, requests }: { items: Item[]; requests: Req[] }) {
  const router = useRouter();
  const [pick, setPick] = useState(items[0] ? `${items[0].kind}:${items[0].itemId}` : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!items.length && !requests.length) return null;
  async function send() {
    const [kind, itemId] = pick.split(":");
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/refund-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, itemId, reason }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) {
      setNote(j?.error ?? "요청하지 못했어요.");
      return;
    }
    setReason("");
    setNote("✅ 요청했어요. 운영자가 확인하면 알림이 가요.");
    router.refresh();
  }
  return (
    <section data-refund-request className="grid gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">
        🔁 마크 환불 요청 <span className="text-xs font-normal text-muted-foreground">(산 지 7일 안 된 마크 · 프레임 · 이펙트)</span>
      </p>
      {items.length ? (
        <div className="grid gap-1.5">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="환불할 상품" className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm">
            {items.map((i) => (
              <option key={`${i.kind}:${i.itemId}`} value={`${i.kind}:${i.itemId}`}>
                {i.name} ({i.kind === "mark" ? "마크" : "프레임 · 이펙트"})
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유(예: 잘못 눌러서 샀어요)" aria-label="환불 사유" className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm" />
            <button type="button" data-refund-request-go disabled={busy || reason.trim().length < 2} onClick={() => void send()} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? "보내는 중…" : "요청"}
            </button>
          </div>
          {note ? <p className="text-xs font-bold">{note}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">지금 요청할 수 있는 상품이 없어요.</p>
      )}
      {requests.length ? (
        <ul className="grid gap-1 text-sm">
          {requests.map((r) => (
            <li key={r.id} data-refund-request-row={r.status} className="flex flex-wrap gap-x-2 border-b border-border/50 py-1">
              <span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).format(new Date(r.at))}</span>
              <b>[{r.name}]</b>
              <span className={r.status === "approved" ? "text-emerald-400" : r.status === "rejected" ? "text-red-400" : "text-amber-300"}>{STATUS[r.status]}</span>
              {r.note ? <span className="text-muted-foreground">· {r.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
