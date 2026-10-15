"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const REASONS = [
  { key: "profanity", label: "비속어 · 욕설" },
  { key: "impersonation", label: "운영진 · 타인 사칭" },
  { key: "ad", label: "광고 · 홍보" },
  { key: "etc", label: "운영 정책 위반" },
];

/** 닉네임 강제 변경 버튼(사유 · 바꿀 닉네임 직접 입력 또는 바른닉네임○○○○ · 변경권 같이 주기) */
export function ForceNickname({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("profanity");
  const [to, setTo] = useState("");
  const [ticket, setTicket] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!open)
    return (
      <button
        type="button"
        data-force-nick={nickname}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center rounded-lg border border-rose-400/60 px-3 text-xs font-bold text-rose-200"
      >
        닉네임 강제 변경
      </button>
    );
  return (
    <div className="grid w-full gap-2 rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-sm">
      <p className="font-bold text-white">「{nickname}」 닉네임을 강제로 바꿔요.</p>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">사유</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-10 rounded-lg border border-border bg-[#1a1617] px-2">
          {REASONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">바꿀 닉네임 (비우면 「바른닉네임○○○○」)</span>
        <input
          data-force-nick-to
          value={to}
          onChange={(e) => setTo(e.target.value.slice(0, 12))}
          placeholder="바른닉네임○○○○"
          className="min-h-10 rounded-lg border border-border bg-[#1a1617] px-2"
        />
      </label>
      <label className="flex min-h-10 items-center gap-2">
        <input type="checkbox" checked={ticket} onChange={(e) => setTicket(e.target.checked)} className="size-4" />
        닉네임 변경권 1장도 주기 <span className="text-xs text-muted-foreground">(본인이 다시 고를 수 있게)</span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          data-force-nick-yes
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch("/api/admin/members/nickname", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nickname, reason, to: to.trim() || undefined, ticket }),
            });
            const json = (await res.json().catch(() => ({}))) as { to?: string; error?: string };
            setBusy(false);
            if (!res.ok) return setMsg({ ok: false, text: json.error ?? "바꾸지 못했어요." });
            setMsg({ ok: true, text: `「${json.to}」로 바꿨어요.` });
            router.refresh();
          }}
          className="min-h-10 rounded-lg bg-rose-600 px-3 font-bold text-white"
        >
          강제 변경
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-border px-3">
          취소
        </button>
      </div>
      {msg ? <p className={msg.ok ? "font-bold text-emerald-300" : "font-bold text-rose-300"}>{msg.text}</p> : null}
    </div>
  );
}

/** 닉네임 변경권 주기(1~5장) */
export function GrantNickTicket({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="변경권 장수"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="min-h-10 rounded-lg border border-border bg-[#1a1617] px-2 text-xs"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}장
          </option>
        ))}
      </select>
      <button
        type="button"
        data-grant-ticket={nickname}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/admin/members/ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname, count }),
          });
          const json = (await res.json().catch(() => ({}))) as { tickets?: number; error?: string };
          setBusy(false);
          if (!res.ok) return setMsg({ ok: false, text: json.error ?? "주지 못했어요." });
          setMsg({ ok: true, text: `변경권 ${count}장 줬어요 (지금 ${json.tickets}장)` });
          router.refresh();
        }}
        className="inline-flex min-h-10 items-center rounded-lg border border-emerald-400/60 px-3 text-xs font-bold text-emerald-200"
      >
        🎫 닉네임 변경권 주기
      </button>
      {msg ? <span className={msg.ok ? "text-xs font-bold text-emerald-300" : "text-xs font-bold text-rose-300"}>{msg.text}</span> : null}
    </div>
  );
}
