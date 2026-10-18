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
      <div data-home-yokai="intro" className="lounge-card flex min-h-14 min-w-0 items-center gap-1.5 rounded-[1.35rem] px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-9 shrink-0 object-contain" />
        <p className="grid min-w-0 flex-1">
          <b className="truncate text-[13px] leading-tight text-white">요괴 마을</b>
          <span className="truncate text-[11.5px] font-bold text-[#e7dcc6]">요괴 키우기</span>
        </p>
        <Link
          href={user ? "/yokai" : "/login?next=%2Fyokai"}
          data-home-yokai-start
          className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-[#7a1c22] px-2 text-[11px] font-black whitespace-nowrap text-white"
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

  // 메인 위쪽 작은 한 칸: 캐릭터 · 칭얼거림 한 줄 · 할 일(배경은 요괴 마을 그대로)
  return (
    <Link
      href="/yokai"
      data-home-yokai="mine"
      aria-label={`${y.name} 보러 요괴 마을 가기`}
      className="relative flex min-h-14 min-w-0 items-center gap-2 overflow-hidden rounded-[1.35rem] border border-[#c9a25c]/40 px-2.5 py-1"
      style={{ background: stageBg(y.species, y.bg) }}
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
      <img
        src={yokaiImage(y.species, y.stage)}
        alt=""
        className="relative size-10 shrink-0 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,.6)]"
        style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
      />
      <span className="relative grid min-w-0 flex-1">
        <b className="truncate text-[13px] leading-tight text-white [text-shadow:0_1px_3px_#000]">{y.name}</b>
        <span
          data-home-yokai-whine={happy ? "happy" : low.key}
          className="truncate text-[11.5px] font-bold text-[#f6efe2] [text-shadow:0_1px_3px_#000]"
        >
          {happy ? pickLine(y.species, "full", y.stage + y.dex) : low.line}
        </span>
      </span>
      <span
        data-home-yokai-go
        className={cn(
          "relative hidden min-h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-black whitespace-nowrap sm:inline-flex",
          happy ? "border border-[#c9a25c]/60 bg-black/50 text-[#e7c98a]" : "bg-[#7a1c22] text-white",
        )}
      >
        {happy ? "🏮 마을" : low.cta}
      </span>
      {/* 휴대폰(반 칸): 할 일은 아이콘만 */}
      <span aria-hidden className={cn("relative shrink-0 text-lg sm:hidden", happy && "opacity-70")}>{happy ? "🏮" : low.cta.slice(0, 2)}</span>
    </Link>
  );
}
