"use client";

import { useState } from "react";
import { useMyTitles } from "@/components/honor/crowned-frame";

/** 프로필(내 것): 칭호가 2개 이상이면 게시판 목록에 먼저 보일 대표 칭호 고르기 */
export function HonorMainPicker({ nickname }: { nickname: string }) {
  const { list, main } = useMyTitles(nickname);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (list.length < 2) return null;
  const value = picked ?? main;

  async function choose(key: string) {
    setPicked(key);
    setNote(null);
    const res = await fetch("/api/me/honor-main", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).catch(() => null);
    setNote(res?.ok ? "저장했어요. 1분 안에 사이트 전체에 반영돼요." : "저장하지 못했어요. 다시 시도해 주세요.");
  }

  return (
    <label className="grid gap-1 text-xs font-bold text-zinc-300">
      대표 칭호(게시판 목록에 먼저 보여요)
      <select
        aria-label="대표 칭호"
        value={value}
        onChange={(e) => void choose(e.target.value)}
        className="h-10 rounded-lg border border-white/20 bg-black px-2 text-sm font-bold text-white"
      >
        <option value="">기본 순서</option>
        {list.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      {note ? <span data-honor-main-note className="font-normal text-zinc-400">{note}</span> : null}
    </label>
  );
}
