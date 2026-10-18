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
      <div data-home-yokai="intro" className="lounge-card flex min-h-14 min-w-0 items-center gap-2 rounded-[1.35rem] px-3 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-10 shrink-0 object-contain" />
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#f6efe2]">🏮 요괴 마을 · 첫 요괴 키우기</p>
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

  // 요괴 마을에 들어가면 보이는 장면 그대로(배경 · 캐릭터 · 말풍선 · 이름표)
  return (
    <Link
      href="/yokai"
      data-home-yokai="mine"
      aria-label={`${y.name} 보러 요괴 마을 가기`}
      className="relative flex min-h-[5.5rem] min-w-0 items-center gap-2 overflow-hidden rounded-[1.35rem] border border-[#c9a25c]/40 px-2 py-1.5"
      style={{ background: stageBg(y.species, y.bg) }}
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-4px)}}`}</style>
      {/* 말풍선(위) */}
      <p
        data-home-yokai-whine={happy ? "happy" : low.key}
        className="relative order-2 line-clamp-2 min-w-0 flex-1 rounded-xl bg-black/65 px-2 py-1 text-[12px] leading-snug font-bold text-[#f6efe2]"
      >
        {happy ? pickLine(y.species, "full", y.stage + y.dex) : low.line}
      </p>
      {/* 캐릭터(가운데 · 크게) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
      <img
        src={yokaiImage(y.species, y.stage)}
        alt=""
        className="relative order-1 size-16 shrink-0 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.6)]"
        style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
      />
      {/* 이름표 · 할 일(아래) */}
      <span className="relative order-3 flex shrink-0 items-center gap-2">
        <span className="hidden min-w-0 sm:grid">
          <b className="truncate text-[14px] leading-tight text-white [text-shadow:0_1px_3px_#000]">{y.name}</b>
          <span className="truncate text-[10.5px] text-[#e7dcc6] [text-shadow:0_1px_3px_#000]">{y.stageName} · {y.stage}단계</span>
        </span>
        <span
          data-home-yokai-go
          className={cn(
            "inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-black whitespace-nowrap",
            happy ? "border border-[#c9a25c]/60 bg-black/50 text-[#e7c98a]" : "bg-[#7a1c22] text-white",
          )}
        >
          {happy ? "🏮 마을" : low.cta}
        </span>
      </span>
    </Link>
  );
}
