"use client";

import { useMemo } from "react";
import { slotsFromText } from "@/lib/job-slots";

/** 공고 본문 → 「빈자리 ○줄로 읽었어요」 미리보기(날짜 형식이 달라 못 읽은 줄을 바로 알 수 있게) */
export function SlotPreview({ text }: { text: string }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const all = useMemo(() => (text.trim() ? slotsFromText(text, today) : []), [text, today]);
  if (!text.trim()) return null;
  const open = all.filter((s) => s.date >= today && !s.closed);
  return (
    <div data-slot-preview className="rounded-xl border border-[#c9a25c]/30 bg-black/30 px-3 py-2 text-xs">
      {all.length ? (
        <>
          <p className="font-bold text-[#ffe08a]">
            📅 빈자리 {open.length}줄로 읽었어요{all.length - open.length ? ` (지난 날 · 마감 ${all.length - open.length}줄 빠짐)` : ""} — 날짜별 빈자리 보드에 이렇게 떠요
          </p>
          <ul className="mt-1 grid gap-0.5 text-[#d6cdee]">
            {open.slice(0, 8).map((s, i) => (
              <li key={i}>
                {Number(s.date.slice(5, 7))}/{Number(s.date.slice(8))} {s.time ?? "시간 협의"} {s.count ?? ""} {s.branch ? `· ${s.branch}` : ""}
              </li>
            ))}
            {open.length > 8 ? <li>… 외 {open.length - 8}줄</li> : null}
          </ul>
        </>
      ) : (
        <p className="font-bold text-[#ffb4b4]">날짜 줄을 못 읽었어요. 「10월 18일 (일) PM 2:00 - 2명」처럼 쓰면 빈자리 보드에 자동으로 떠요.</p>
      )}
    </div>
  );
}
