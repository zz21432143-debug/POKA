"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

/**
 * 오르내림 ▲2(초록) · ▼1(빨강) · NEW · 그대로면 「-」.
 * 누르면(휴대폰) · 올리면(PC) 「이번 주 시작 3위 → 지금 1위」 설명. 목록 링크 안에서 눌러도 넘어가지 않음.
 */
export function RankChange({
  change,
  before,
  now,
  base = "이번 주 시작",
}: {
  change?: number | "new" | null;
  before?: number | null;
  now?: number | null;
  base?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 3000);
    return () => window.clearTimeout(timer);
  }, [open]);
  if (change == null) return null;
  const tip =
    change === "new"
      ? `${base}엔 순위에 없었어요${now ? ` → 지금 ${now}위` : ""}`
      : before != null && now != null
        ? `${base} ${before}위 → 지금 ${now}위`
        : `${base}보다 ${change === 0 ? "그대로" : change > 0 ? `${change}계단 오름` : `${-change}계단 내림`}`;
  const text = change === "new" ? "NEW" : change === 0 ? "-" : change > 0 ? `▲${change}` : `▼${-change}`;
  const tone = change === "new" ? "text-sky-300" : change === 0 ? "text-zinc-500" : change > 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <span
      data-rank-change={change}
      role="button"
      tabIndex={0}
      title={tip}
      aria-label={tip}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      onBlur={() => setOpen(false)}
      className={cn("relative shrink-0 cursor-help text-[10px] font-black tabular-nums", tone)}
    >
      {text}
      {open ? (
        <span role="tooltip" data-rank-tip className="absolute top-full right-0 z-50 mt-1 w-max max-w-[14rem] rounded-lg border border-[#c9a25c]/50 bg-[#120d0a] px-2 py-1 text-[11px] font-bold whitespace-normal text-white shadow-lg">
          {tip}
        </span>
      ) : null}
    </span>
  );
}
