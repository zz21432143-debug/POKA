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
        className="relative flex min-h-16 min-w-0 items-center gap-2.5 overflow-hidden rounded-[1.35rem] border border-[#ffcf4a]/60 bg-[radial-gradient(circle_at_20%_50%,#4a1d5e_0%,#1a0f24_70%)] px-3 py-1.5"
      >
        <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img src={yokaiImage(STARTERS[0], 1)} alt="" className="size-12 shrink-0 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,.6)]" style={{ animation: "hy-bob 2.4s ease-in-out infinite" }} />
        <span className="grid min-w-0 flex-1">
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
  // PC: 요괴 칸 아래 「오늘 할 일」(밥이 생기는 활동 · 옆 퀴즈가 길어져도 빈칸이 안 남게). 휴대폰은 숨김
  const todo = [
    { done: y.sources.attended, label: "출석체크", href: "/attendance" },
    { done: y.sources.quiz, label: "오늘의 퀴즈 맞히기", href: "/quiz" },
    { done: y.sources.posted, label: "글 1개 쓰기", href: "/boards/free/write" },
    { done: y.sources.commented, label: "댓글 1개 쓰기", href: "/boards/free" },
    { done: Boolean(y.sources.answered), label: "내 답변 채택받기(보너스)", href: "/boards/hand-review" },
  ];
  const doneCount = todo.filter((t) => t.done).length;
  return (
    <div className="flex min-w-0 flex-col gap-2">
    <Link
      href="/yokai"
      data-home-yokai="mine"
      aria-label={`${y.name} 보러 요괴 마을 가기`}
      className="relative flex min-h-24 min-w-0 items-center gap-3 overflow-hidden rounded-[1.35rem] border border-[#ffcf4a]/60 px-3 py-2"
    >
      <style>{`@keyframes hy-bob{50%{transform:translateY(-3px)}}`}</style>
      {/* 배경: 휴대폰은 칸 전체, PC는 위 그림 칸만 */}
      <span aria-hidden className="absolute inset-0" style={{ background: stageBg(y.species, y.bg) }} />
      <span className="relative grid shrink-0 place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
        <img
          src={yokaiImage(y.species, y.stage)}
          alt=""
          className="size-16 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,.6)] lg:size-20"
          style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
        />
      </span>
      <span className="relative grid min-w-0 flex-1 gap-0.5">
        <b className="truncate text-[15px] leading-tight text-white [text-shadow:0_1px_3px_#000]">{y.name}</b>
        <span
          data-home-yokai-whine={happy ? "happy" : low.key}
          className="line-clamp-2 text-[12.5px] font-bold leading-snug text-[#f6efe2] [text-shadow:0_1px_3px_#000]"
        >
          {happy ? pickLine(y.species, "full", y.stage + y.dex) : low.line}
        </span>
      </span>
      <span
        data-home-yokai-go
        className={cn(
          "relative inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3.5 text-sm font-black whitespace-nowrap",
          happy ? "border border-[#c9a25c]/60 bg-black/50 text-[#e7c98a]" : "bg-[#ffcf4a] text-[#2a1400]",
        )}
      >
        {happy ? "🏮 마을" : low.cta}
      </span>
    </Link>
    <section data-home-todo aria-label="오늘 할 일" className="hidden rounded-[1.1rem] border border-white/10 bg-[#1a1411] p-3.5 lg:block">
      <p className="flex items-baseline justify-between text-base font-black text-[#f3d9a4]">
        오늘 할 일 <span className="text-xs text-[#b8ab98]">{doneCount}/{todo.length}</span>
      </p>
      <p className="mt-0.5 text-xs text-[#a89c88]">하나 할 때마다 요괴 밥이 하나 더 생겨요</p>
      {/* 5개 모두(한 것은 ✅ · 흐리게) */}
      <ul className="mt-2 grid gap-1">
        {todo.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold hover:bg-white/5",
                t.done ? "text-emerald-300/80 line-through decoration-emerald-300/40" : "text-[#ece3d3]",
              )}
            >
              {t.done ? "✅" : "⬜"} {t.label} {t.done ? null : <span className="ml-auto text-xs text-[#c9a25c]">›</span>}
            </Link>
          </li>
        ))}
      </ul>
      {doneCount === todo.length ? <p className="mt-1 px-2 text-xs text-emerald-300">오늘 할 일을 다 했어요!</p> : null}
    </section>
    </div>
  );
}
