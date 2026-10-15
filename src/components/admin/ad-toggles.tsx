"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** 광고 구좌별 켜기 · 끄기(마스터) — 끄면 그 자리에 광고 칸이 안 그려짐(최대 1분 뒤 반영) */
export function AdToggles({ slots, off }: { slots: { key: string; label: string; set: boolean }[]; off: string[] }) {
  const router = useRouter();
  const [offSet, setOffSet] = useState(() => new Set(off));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {slots.map((s) => {
          const on = !offSet.has(s.key);
          return (
            <li key={s.key} className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-3">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{s.label}</b>
                <span className="text-xs text-muted-foreground">
                  {s.key} · {s.set ? "단위 ID 있음" : "단위 ID 없음(Vercel 환경변수)"}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                data-ad-toggle={s.key}
                disabled={busy === s.key}
                onClick={async () => {
                  setBusy(s.key);
                  setMsg(null);
                  const res = await fetch("/api/admin/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placement: s.key, on: !on }) });
                  const json = (await res.json().catch(() => ({}))) as { off?: string[]; error?: string };
                  setBusy(null);
                  if (!res.ok || !json.off) return setMsg(json.error ?? "바꾸지 못했어요.");
                  setOffSet(new Set(json.off));
                  setMsg("저장했어요. 사이트에는 1분 안에 반영돼요.");
                  router.refresh();
                }}
                className={`min-h-10 min-w-16 rounded-full px-3 text-sm font-black ${on ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
              >
                {on ? "켜짐" : "꺼짐"}
              </button>
            </li>
          );
        })}
      </ul>
      {msg ? <p className="text-sm font-bold text-emerald-300">{msg}</p> : null}
    </div>
  );
}
