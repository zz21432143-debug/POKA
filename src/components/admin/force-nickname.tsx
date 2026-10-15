"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const REASONS = [
  { key: "profanity", label: "비속어 · 욕설" },
  { key: "impersonation", label: "운영진 · 타인 사칭" },
  { key: "ad", label: "광고 · 홍보" },
  { key: "etc", label: "운영 정책 위반" },
];

/** 닉네임 강제 변경 버튼(사유 고르고 한 번 더 확인) */
export function ForceNickname({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("profanity");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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
      <p className="font-bold text-white">
        「{nickname}」을(를) 「바른닉네임○○○○」로 바꾸고 변경권 1장을 줘요.
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-10 rounded-lg border border-border bg-[#1a1617] px-2"
      >
        {REASONS.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
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
              body: JSON.stringify({ nickname, reason }),
            });
            const json = (await res.json().catch(() => ({}))) as {
              to?: string;
              error?: string;
            };
            setBusy(false);
            if (!res.ok) return setMsg(json.error ?? "바꾸지 못했어요.");
            setMsg(`「${json.to}」로 바꿨어요.`);
            router.refresh();
          }}
          className="min-h-10 rounded-lg bg-rose-600 px-3 font-bold text-white"
        >
          강제 변경
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 rounded-lg border border-border px-3"
        >
          취소
        </button>
      </div>
      {msg ? <p className="font-bold text-emerald-300">{msg}</p> : null}
    </div>
  );
}
