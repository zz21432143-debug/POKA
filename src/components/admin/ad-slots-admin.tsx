"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdSlotRow = {
  key: string;
  label: string;
  /** 관리자 화면에서 넣은 ID */
  saved: string;
  /** Vercel 환경변수 ID */
  env: string;
  /** 실제로 쓰이는 ID(저장값 → 환경변수 → 기본 ID) */
  used: string;
  /** 최근 7일 실제 노출(채워짐 · 빈칸) */
  fill: { filled: number; unfilled: number } | null;
};

/** 광고 자리마다: 사용 가능 여부 · 단위 ID 붙여넣기 · 켜기/끄기 — 다시 배포할 필요 없음(1분 안에 반영) */
export function AdSlotsAdmin({ rows, off, defaultSaved, client }: { rows: AdSlotRow[]; off: string[]; defaultSaved: string; client: string | null }) {
  const router = useRouter();
  const [offSet, setOffSet] = useState(() => new Set(off));
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries([["default", defaultSaved], ...rows.map((r) => [r.key, r.saved])]));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; text: string; bad?: boolean } | null>(null);

  async function call(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setMsg(null);
    const res = await fetch("/api/admin/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placement: key, ...body }) }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as { off?: string[]; slots?: Record<string, string>; error?: string };
    setBusy(null);
    if (!res?.ok) {
      setMsg({ key, text: json.error ?? "저장하지 못했어요.", bad: true });
      return null;
    }
    return json;
  }
  async function saveSlot(key: string) {
    const json = await call(key, { slot: draft[key] ?? "" });
    if (!json?.slots) return;
    setDraft((d) => ({ ...d, [key]: json.slots?.[key] ?? "" }));
    setMsg({ key, text: json.slots[key] ? "✅ 저장했어요. 1분 안에 사이트에 나와요." : "지웠어요." });
    router.refresh();
  }
  async function toggle(key: string, on: boolean) {
    const json = await call(key, { on });
    if (!json?.off) return;
    setOffSet(new Set(json.off));
    setMsg({ key, text: on ? "켰어요." : "껐어요." });
    router.refresh();
  }

  const input = (key: string, placeholder: string) => (
    <input
      value={draft[key] ?? ""}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      placeholder={placeholder}
      aria-label="광고 단위 ID"
      data-ad-slot-input={key}
      className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 font-mono text-sm"
    />
  );

  return (
    <div className="grid gap-3">
      {!client ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold text-red-300">게시자 ID(ca-pub-…)가 없어 광고가 나올 수 없어요.</p> : null}
      <div data-ad-slot-default className="grid gap-1.5 rounded-xl border border-primary/40 bg-primary/5 p-3">
        <b className="text-sm">⭐ 기본 광고 단위 ID — 아래에서 ID가 비어 있는 자리 모두에 씀</b>
        <p className="text-xs text-muted-foreground">애드센스 → 광고 → 광고 단위 기준 → 「디스플레이 광고」 하나만 만들어 그 숫자를 넣으면 모든 자리가 바로 켜져요. 광고 코드를 통째로 붙여넣어도 숫자만 읽어요.</p>
        <div className="flex gap-1.5">
          {input("default", "예: 1234567890")}
          <button type="button" data-ad-slot-save="default" disabled={busy === "default"} onClick={() => void saveSlot("default")} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
            저장
          </button>
        </div>
        {msg?.key === "default" ? <p className={`text-xs font-bold ${msg.bad ? "text-red-300" : "text-emerald-300"}`}>{msg.text}</p> : null}
      </div>
      <ul className="grid gap-1.5">
        {rows.map((r) => {
          const on = !offSet.has(r.key);
          const live = Boolean(client && r.used && on);
          const from = r.saved ? "직접 넣은 ID" : r.env ? "Vercel 환경변수" : r.used ? "기본 ID" : null;
          return (
            <li key={r.key} data-ad-slot-row={r.key} className="grid gap-1.5 rounded-xl border border-border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span data-ad-slot-status={live ? "live" : r.used ? "off" : "none"} className={`rounded-full px-2 py-0.5 text-xs font-black ${live ? "bg-emerald-600 text-white" : r.used ? "bg-zinc-600 text-zinc-100" : "bg-amber-500/25 text-amber-200"}`}>
                  {live ? "● 광고 나가는 중" : r.used ? "꺼 둠" : "ID 없음 · 사용 불가"}
                </span>
                <b className="min-w-0 flex-1 text-sm">{r.label}</b>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  data-ad-toggle={r.key}
                  disabled={busy === r.key}
                  onClick={() => void toggle(r.key, !on)}
                  className={`min-h-9 min-w-16 rounded-full px-3 text-sm font-black ${on ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
                >
                  {on ? "켜짐" : "꺼짐"}
                </button>
              </div>
              <div className="flex gap-1.5">
                {input(r.key, r.env ? `환경변수 ${r.env} 사용 중 · 바꾸려면 입력` : r.used ? `기본 ID ${r.used} 사용 중 · 이 자리만 다른 ID` : "광고 단위 ID 붙여넣기")}
                <button type="button" data-ad-slot-save={r.key} disabled={busy === r.key} onClick={() => void saveSlot(r.key)} className="min-h-10 rounded-lg border border-border px-3 text-sm font-bold disabled:opacity-50">
                  저장
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {r.key}
                {from ? ` · ${from} ${r.used}` : ""}
              </span>
              {r.used ? (
                <span data-ad-fill={r.key} className="text-xs">
                  최근 7일 실제 노출:{" "}
                  {r.fill && r.fill.filled + r.fill.unfilled > 0 ? (
                    <>
                      <b className="text-emerald-300">채워짐 {r.fill.filled}</b> · <b className="text-amber-300">빈칸 {r.fill.unfilled}</b>{" "}
                      <span className="text-muted-foreground">({Math.round((r.fill.filled / (r.fill.filled + r.fill.unfilled)) * 100)}%)</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">아직 기록 없음(승인 전이거나 방문 전)</span>
                  )}
                </span>
              ) : null}
              {msg?.key === r.key ? <p className={`text-xs font-bold ${msg.bad ? "text-red-300" : "text-emerald-300"}`}>{msg.text}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
