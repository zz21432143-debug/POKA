"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WinReward } from "@/lib/game-reward";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok ? null : (json.error ?? "처리하지 못했어요.");
}

/** 방 강제 닫기 버튼(확인 한 번) */
export function CloseRoomButton({ game, id }: { game: "omok" | "yut"; id: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ask)
    return (
      <button type="button" data-admin-close-room={id} onClick={() => setAsk(true)} className="min-h-9 rounded-lg border border-rose-400/60 px-2.5 text-xs font-bold text-rose-200">
        방 닫기
      </button>
    );
  return (
    <span className="flex gap-1">
      <button
        type="button"
        data-admin-close-yes
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await post({ action: "close", game, id });
          setBusy(false);
          if (err) alert(err);
          router.refresh();
        }}
        className="min-h-9 rounded-lg bg-rose-600 px-2.5 text-xs font-bold text-white"
      >
        정말 닫기
      </button>
      <button type="button" onClick={() => setAsk(false)} className="min-h-9 rounded-lg border border-border px-2.5 text-xs">
        취소
      </button>
    </span>
  );
}

/** 대기실에서 내보내기 */
export function KickButton({ game, id, userId, name }: { game: "omok" | "yut"; id: string; userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      data-admin-kick={userId}
      disabled={busy}
      onClick={async () => {
        if (!confirm(`${name}님을 이 대기실에서 내보낼까요?`)) return;
        setBusy(true);
        const err = await post({ action: "kick", game, id, userId });
        setBusy(false);
        if (err) alert(err);
        router.refresh();
      }}
      className="rounded-md border border-amber-400/60 px-1.5 text-[11px] font-bold text-amber-200"
    >
      ✕ 강퇴
    </button>
  );
}

const FIELDS: { key: keyof WinReward; label: string; unit: string }[] = [
  { key: "points", label: "포인트", unit: "P" },
  { key: "exp", label: "경험치", unit: "EXP" },
  { key: "affection", label: "요괴 친밀도", unit: "" },
  { key: "perDay", label: "하루 보상 횟수", unit: "판" },
  { key: "perOpponentPerDay", label: "같은 상대(멤버) 하루", unit: "판" },
];

/** 승리 보상 조정(오목 · 윷놀이 공통) */
export function RewardForm({ initial }: { initial: WinReward }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      data-admin-reward
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await post({ action: "reward", reward: v });
        setBusy(false);
        setMsg(err ?? "저장했어요. 다음 판부터 1분 안에 반영돼요.");
      }}
    >
      <div className="grid gap-2 sm:grid-cols-5">
        {FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1 text-xs text-muted-foreground">
            {f.label}
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={1000}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
                className="min-h-10 w-full rounded-lg border border-border bg-[#1a1617] px-2 text-base text-white"
              />
              <span className="shrink-0">{f.unit}</span>
            </span>
          </label>
        ))}
      </div>
      <button type="submit" disabled={busy} className="min-h-10 w-fit rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white">
        보상 저장
      </button>
      {msg ? <p className="text-sm font-bold text-emerald-300">{msg}</p> : null}
    </form>
  );
}
