import Link from "@/components/ui/link";
import { cn } from "cn";
import { getCurrentUser } from "@/lib/current-user";
import { pickLine } from "@/lib/yokai-lines";
import {
  STARTERS,
  stageBg,
  yokaiImage,
} from "@/lib/yokai";
import { cache } from "react";
import { yokaiHome, yokaiPublic } from "@/lib/yokai-server";

const yokaiHomeOnce = cache((userId: string) => yokaiHome(userId));


/** 홈: 요괴 마을 칸. 키우는 요괴가 있으면 상태 · 할 일, 없으면 시작 요괴 소개 */
export async function HomeYokai() {
  const user = await getCurrentUser().catch(() => null);
  if (!yokaiPublic() && !user?.isMaster) return null;
  const y = user ? await yokaiHomeOnce(user.id).catch(() => null) : null;


  if (!y) {
    return (
      <Link
        href={user ? "/yokai" : "/login?next=%2Fyokai"}
        data-home-yokai="intro"
        className="relative flex min-h-16 min-w-0 items-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-[#ffcf4a]/60 bg-[radial-gradient(circle_at_20%_50%,#4a1d5e_0%,#1a0f24_70%)] px-3 py-1.5 lg:min-h-56 lg:flex-col lg:justify-center lg:gap-1.5 lg:self-start lg:py-3 lg:text-center"
      >
        <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-12 shrink-0 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,.6)] lg:size-20" style={{ animation: "hy-bob 2.4s ease-in-out infinite" }} />
        <span className="grid min-w-0 flex-1 lg:flex-none">
          <b className="truncate text-sm leading-tight text-[#ffe08a]">🏮 요괴 마을</b>
          <span className="truncate text-xs font-bold text-[#f3e8ff]">내 요괴 골라서 밥 주고 키우기</span>
        </span>
        <span data-home-yokai-start className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[#ffcf4a] px-3 text-xs font-black whitespace-nowrap text-[#2a1400]">
          {user ? "요괴 고르기" : "시작하기"}
        </span>
      </Link>
    );
  }

  // 밥 · 샤워 · 만지기 중 가장 낮은 것 하나만 칭얼거림(나머지는 요괴 마을 안에서)
  const needs = [
    { key: "feed", value: y.fullness, line: pickLine(y.species, "hungry", y.stage + y.dex), cta: "🍙 밥 주기" },
    { key: "shower", value: y.clean, line: pickLine(y.species, "dirty", y.stage + y.dex), cta: "🛁 샤워시키기" },
    { key: "pet", value: y.affection, line: "심심해… 나 좀 쓰다듬어 줘!", cta: "🤲 쓰다듬어 주기" },
  ];
  const low = needs.reduce((m, n) => (n.value < m.value ? n : m));
  const happy = low.value >= 70;

  // 메인 위쪽 작은 한 칸: 캐릭터 · 칭얼거림 · 할 일.
  // PC: 위는 요괴 마을 배경 + 큰 캐릭터(높이 고정), 아래는 차분한 바탕에 글씨 · 버튼 — 옆 퀴즈가 길어져도 같이 늘어나지 않음
  return (
    <Link
      href="/yokai"
      data-home-yokai="mine"
      aria-label={`${y.name} 보러 요괴 마을 가기`}
      className="relative flex min-h-16 min-w-0 items-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-[#ffcf4a]/60 px-3 py-1.5 lg:flex-col lg:gap-0 lg:self-start lg:bg-[#1a1411] lg:p-0 lg:text-center"
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
      {/* 배경: 휴대폰은 칸 전체, PC는 위 그림 칸만 */}
      <span aria-hidden className="absolute inset-0 lg:bottom-auto lg:h-36" style={{ background: stageBg(y.species, y.bg) }} />
      <span className="relative grid shrink-0 place-items-center lg:h-36 lg:w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img
          src={yokaiImage(y.species, y.stage)}
          alt=""
          className="size-12 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,.6)] lg:size-28"
          style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
        />
      </span>
      <span className="relative grid min-w-0 flex-1 lg:w-full lg:flex-none lg:gap-0.5 lg:bg-[#1a1411] lg:px-3 lg:pt-2.5">
        <b className="truncate text-[13px] leading-tight text-white [text-shadow:0_1px_3px_#000]">{y.name}</b>
        <span
          data-home-yokai-whine={happy ? "happy" : low.key}
          className="truncate text-[11.5px] font-bold text-[#f6efe2] [text-shadow:0_1px_3px_#000] lg:line-clamp-2 lg:whitespace-normal lg:text-xs lg:[text-shadow:none]"
        >
          {happy ? pickLine(y.species, "full", y.stage + y.dex) : low.line}
        </span>
      </span>
      <span
        data-home-yokai-go
        className={cn(
          "relative inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3 text-xs font-black whitespace-nowrap lg:mx-auto lg:mb-3 lg:mt-2",
          happy ? "border border-[#c9a25c]/60 bg-black/50 text-[#e7c98a]" : "bg-[#ffcf4a] text-[#2a1400]",
        )}
      >
        {happy ? "🏮 마을" : low.cta}
      </span>
    </Link>
  );
}
