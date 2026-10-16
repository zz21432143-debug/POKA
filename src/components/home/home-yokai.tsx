import Link from "@/components/ui/link";
import { cn } from "cn";
import { getCurrentUser } from "@/lib/current-user";
import { pickLine } from "@/lib/yokai-lines";
import {
  STARTERS,
  bgCss,
  yokaiImage,
} from "@/lib/yokai";
import { yokaiHome, yokaiPublic } from "@/lib/yokai-server";


/** 홈: 요괴 마을 칸. 키우는 요괴가 있으면 상태 · 할 일, 없으면 시작 요괴 소개 */
export async function HomeYokai() {
  const user = await getCurrentUser().catch(() => null);
  if (!yokaiPublic() && !user?.isMaster) return null;
  const y = user ? await yokaiHome(user.id).catch(() => null) : null;


  if (!y) {
    return (
      <div data-home-yokai="intro" className="lounge-card flex min-w-0 items-center gap-2 rounded-[1.35rem] px-2 py-1.5 lg:min-h-[13rem] lg:flex-col lg:justify-center lg:text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-10 shrink-0 object-contain lg:size-24" />
        <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#f6efe2] lg:flex-none lg:whitespace-normal">🏮 요괴 마을 · 첫 요괴 키우기</p>
        <Link
          href={user ? "/yokai" : "/login?next=%2Fyokai"}
          data-home-yokai-start
          className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-[#7a1c22] px-2.5 text-[11px] font-black whitespace-nowrap text-white"
        >
          {user ? "고르기" : "시작"}
        </Link>
      </div>
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

  return (
    <div
      data-home-yokai="mine"
      className="lounge-card relative flex min-w-0 items-center gap-2 overflow-hidden rounded-[1.35rem] px-2 py-1.5 lg:min-h-[13rem] lg:flex-col lg:items-stretch lg:justify-between lg:p-2"
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
      {/* PC: 카드 전체 배경(요괴 방) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block" style={{ background: bgCss(y.bg) }} />
      <Link
        href="/yokai"
        aria-label={`${y.name} 보러 가기`}
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#c9a25c]/30 lg:absolute lg:inset-0 lg:size-auto lg:rounded-none lg:border-0"
        style={{ background: bgCss(y.bg) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(y.species, y.stage)} alt="" className="w-[86%] object-contain lg:mt-4 lg:w-[72%] lg:drop-shadow-[0_8px_12px_rgba(0,0,0,.6)]" style={{ animation: "hy-bob 2.4s ease-in-out infinite" }} />
      </Link>
      <p
        data-home-yokai-whine={happy ? "happy" : low.key}
        title={happy ? undefined : low.line}
        className="relative line-clamp-2 min-w-0 flex-1 text-[12px] leading-snug font-bold text-[#f6efe2] lg:pointer-events-none lg:flex-none lg:rounded-xl lg:bg-black/65 lg:px-2 lg:py-1 lg:text-center lg:text-[11.5px]"
      >
        {happy ? `${y.name}: 기분 좋아요 ✨` : low.line}
      </p>
      <span className="relative hidden items-end justify-between gap-1 lg:pointer-events-none lg:flex">
        <b className="rounded-md bg-black/60 px-1.5 py-0.5 text-[12px] text-white">{y.name}</b>
      </span>
      <Link
        href="/yokai"
        data-home-yokai-go
        className={cn(
          "relative inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-black whitespace-nowrap lg:absolute lg:right-2 lg:bottom-2",
          happy ? "border border-[#c9a25c]/40 text-[#e7c98a]" : "bg-[#7a1c22] text-white hover:bg-[#93242c]",
        )}
      >
        {happy ? "🏮 마을" : low.cta}
      </Link>
    </div>
  );
}
