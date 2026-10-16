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
      <section
        aria-label="요괴 마을"
        data-home-yokai="intro"
        className="flex h-full items-center gap-3 rounded-[1.3rem] border border-[#c9a25c]/25 bg-[#16100e] p-3"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-16 shrink-0 object-contain sm:size-20" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <p className="text-sm font-bold text-[#f6efe2]">🏮 요괴 마을 — 첫 요괴를 골라 키워 보세요</p>
          <Link
            href={user ? "/yokai" : "/login?next=%2Fyokai"}
            data-home-yokai-start
            className="inline-flex min-h-9 w-fit items-center rounded-full bg-[#7a1c22] px-3.5 text-xs font-black text-white hover:bg-[#93242c]"
          >
            {user ? "첫 요괴 고르러 가기" : "로그인하고 요괴 키우기"}
          </Link>
        </div>
      </section>
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
    <section
      aria-label="요괴 마을"
      data-home-yokai="mine"
      className="flex h-full items-center gap-3 rounded-[1.3rem] border border-[#c9a25c]/25 bg-[#16100e] p-3"
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-4px)}}`}</style>
      <Link
        href="/yokai"
        aria-label={`${y.name} 보러 가기`}
        className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#c9a25c]/30 sm:size-24"
        style={{ background: bgCss(y.bg) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img
          src={yokaiImage(y.species, y.stage)}
          alt=""
          className="w-[84%] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.6)]"
          style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
        />
      </Link>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="text-xs font-bold text-[#e7c98a]">🏮 {y.name}</p>
        <p
          data-home-yokai-whine={happy ? "happy" : low.key}
          className="w-fit max-w-full rounded-2xl rounded-tl-sm border border-[#c9a25c]/30 bg-black/35 px-3 py-1.5 text-[13px] font-bold text-[#f6efe2]"
        >
          「{happy ? pickLine(y.species, "full", y.stage + y.dex) : low.line}」
        </p>
        <Link
          href="/yokai"
          data-home-yokai-go
          className={cn(
            "inline-flex min-h-9 w-fit items-center rounded-full px-3.5 text-xs font-black",
            happy ? "border border-[#c9a25c]/40 text-[#e7c98a]" : "bg-[#7a1c22] text-white hover:bg-[#93242c]",
          )}
        >
          {happy ? "요괴 마을 가기" : low.cta}
        </Link>
      </div>
    </section>
  );
}
