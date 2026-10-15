import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { getCurrentUser } from "@/lib/current-user";
import { pickLine } from "@/lib/yokai-lines";
import {
  RARITY_LABEL,
  STARTERS,
  YOKAI,
  YOKAI_ORDER,
  bgCss,
  yokaiImage,
} from "@/lib/yokai";
import { yokaiHome, yokaiPublic } from "@/lib/yokai-server";

const bar = (value: number, max: number, color: string) => (
  <div className="h-2 overflow-hidden rounded-full bg-white/10">
    <div
      className="h-full rounded-full"
      style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        background: color,
      }}
    />
  </div>
);

/** 홈: 요괴 마을 칸. 키우는 요괴가 있으면 상태 · 할 일, 없으면 시작 요괴 소개 */
export async function HomeYokai() {
  const user = await getCurrentUser().catch(() => null);
  if (!yokaiPublic() && !user?.isMaster) return null;
  const y = user ? await yokaiHome(user.id).catch(() => null) : null;
  const total = YOKAI_ORDER.length;

  const head = (
    <div className="flex items-center gap-2">
      <h2 className="text-base font-black text-white">🏮 요괴 마을</h2>
      {y ? (
        <span className="text-xs font-bold text-[#e7c98a] tabular-nums">
          도감 {y.dex}/{total}
        </span>
      ) : (
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-white">
          NEW
        </span>
      )}
      <Link
        href="/yokai"
        data-home-yokai-enter
        className="yk-enter ml-auto inline-flex min-h-10 items-center gap-1 rounded-full px-3.5 text-xs font-black text-[#2a1606] shadow-[0_0_14px_rgba(245,215,110,.35)] transition active:scale-95"
      >
        🏮 마을 들어가기
        <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );

  if (!y) {
    return (
      <YokaiGlow>
        <section
          aria-label="요괴 마을"
          data-home-yokai="intro"
          className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.3rem] bg-[#16100e] p-3 sm:p-4"
        >
          {head}
          <p className="text-sm text-[#d1c7b5]">
            첫 요괴를 골라 키우고, 사이트 활동으로 새 요괴를 만나 보세요. 전설의
            구미호와 염라대왕도 기다려요.
          </p>
          <div className="grid grid-cols-5 items-end gap-2">
            {STARTERS.map((s) => (
              <div
                key={s}
                className="grid justify-items-center gap-0.5 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
                <img
                  src={yokaiImage(s, 1)}
                  alt={YOKAI[s].name}
                  className="aspect-square w-full max-w-28 object-contain"
                />
                <span className="text-xs font-bold text-white">
                  {YOKAI[s].name}
                </span>
              </div>
            ))}
            {(["gumiho", "yeomra"] as const).map((s) => (
              <div
                key={s}
                className="grid justify-items-center gap-0.5 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 전설은 실루엣 */}
                <img
                  src={yokaiImage(s, 5)}
                  alt=""
                  className="aspect-square w-full max-w-28 object-contain opacity-40 brightness-0"
                />
                <span className="text-[11px] font-bold text-[#f5d76e]">
                  전설 ???
                </span>
              </div>
            ))}
          </div>
          <Link
            href={user ? "/yokai" : "/login?next=%2Fyokai"}
            data-home-yokai-start
            className="yk-cta-pulse mt-auto grid min-h-11 place-items-center rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c]"
          >
            {user ? "첫 요괴 고르러 가기" : "로그인하고 요괴 키우기"}
          </Link>
        </section>
      </YokaiGlow>
    );
  }

  const full = Boolean(y.feedAt);
  const status = y.newcomers.length
    ? {
        text: `✨ 새 요괴 ${y.newcomers.length}마리가 찾아왔어요!`,
        cta: "만나러 가기",
        hot: true,
      }
    : y.fullness < 30
      ? { text: `🍙 ${y.name}가 배고파해요`, cta: "밥 주러 가기", hot: true }
      : y.clean < 30
        ? {
            text: `🛁 ${y.name}가 꼬질꼬질해요`,
            cta: "샤워시키러 가기",
            hot: true,
          }
        : y.feedsLeft > 0 && !full
          ? {
              text: `🍙 오늘 밥이 ${y.feedsLeft}번 남았어요`,
              cta: "밥 주러 가기",
              hot: true,
            }
          : full && y.feedsLeft > 0
            ? {
                text: "배불러요 · 조금 뒤에 또 먹을 수 있어요",
                cta: "요괴 마을 가기",
                hot: false,
              }
            : {
                text: "오늘 밥은 다 줬어요 · 출석 · 퀴즈로 더 받을 수 있어요",
                cta: "요괴 마을 가기",
                hot: false,
              };

  return (
    <YokaiGlow>
      <section
        aria-label="요괴 마을"
        data-home-yokai="mine"
        className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.3rem] bg-[#16100e] p-3 sm:p-4"
      >
        <style>{`@keyframes hy-bob{50%{transform:translateY(-5px)}}`}</style>
        {head}
        <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
          <Link
            href="/yokai"
            aria-label={`${y.name} 보러 가기`}
            className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#c9a25c]/30"
            style={{ background: bgCss(y.bg) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
            <img
              src={yokaiImage(y.species, y.stage)}
              alt=""
              className="w-[82%] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.6)]"
              style={{ animation: "hy-bob 2.4s ease-in-out infinite" }}
            />
          </Link>
          <div className="grid content-start gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-lg text-white">{y.stageName}</b>
              <span className="text-xs text-zinc-400">
                {y.name} · {y.stage}단계 · {RARITY_LABEL[y.rarity]}
              </span>
            </div>
            <div className="grid gap-1 text-[11px] text-zinc-400">
              <span className="flex justify-between">
                포만감 <span className="tabular-nums">{y.fullness}/100</span>
              </span>
              {bar(y.fullness, 100, "#e7a24a")}
              <span className="flex justify-between">
                청결도 <span className="tabular-nums">{y.clean}/100</span>
              </span>
              {bar(y.clean, 100, "#6cc3f0")}
              <span className="flex justify-between">
                친밀도{" "}
                <span className="tabular-nums">
                  {y.affection}/100 · {y.bond}
                </span>
              </span>
              {bar(y.affection, 100, "#e86a8a")}
              {y.next ? (
                <>
                  <span className="flex justify-between">
                    다음 진화{" "}
                    <span className="tabular-nums">
                      {y.next.have}/{y.next.need}
                    </span>
                  </span>
                  {bar(y.next.have, y.next.need, "#c9a25c")}
                </>
              ) : (
                <span className="font-bold text-[#f5d76e]">
                  ✨ 최종 진화 완료
                </span>
              )}
            </div>
            <p
              data-home-yokai-status
              className={cn(
                "text-xs font-bold",
                status.hot ? "text-[#f3d9a4]" : "text-zinc-400",
              )}
            >
              {status.text}
            </p>
          </div>
        </div>
        {/* 미니 도감: 만난 요괴는 그림, 못 만난 요괴는 실루엣(등급별 테두리) */}
        <div data-home-yokai-dex className="grid gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
            <span>요괴 도감</span>
            <span className="tabular-nums text-[#e7c98a]">
              {y.dex} / {total}
            </span>
          </div>
          <div className="grid grid-cols-9 gap-1 [&>*]:min-w-0">
            {YOKAI_ORDER.map((s) => {
              const mine = y.owned.find((o) => o.species === s);
              const r = YOKAI[s].rarity;
              return (
                <Link
                  key={s}
                  href="/yokai"
                  title={mine ? YOKAI[s].name : "???"}
                  aria-label={mine ? YOKAI[s].name : "아직 못 만난 요괴"}
                  data-home-dex-cell={mine ? "have" : "none"}
                  className={cn(
                    "relative grid aspect-square place-items-center overflow-hidden rounded-md border bg-black/35",
                    r === "legend"
                      ? "border-[#f5d76e]/70"
                      : r === "hero"
                        ? "border-[#d9dde6]/50"
                        : r === "rare"
                          ? "border-sky-300/30"
                          : "border-white/10",
                    s === y.species && "ring-1 ring-[#e7c98a]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 · 못 만난 요괴는 실루엣 */}
                  <img
                    src={yokaiImage(s, mine ? mine.stage : 1)}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "size-full object-contain p-0.5",
                      !mine && "opacity-25 brightness-0",
                    )}
                  />
                </Link>
              );
            })}
          </div>
        </div>
        {/* 요괴 한마디(성격 · 지금 상태에 맞게) */}
        <p
          data-home-yokai-line
          className="w-fit max-w-full rounded-2xl rounded-tl-sm border border-[#c9a25c]/30 bg-black/35 px-3 py-2 text-xs font-bold text-[#f6efe2]"
        >
          「
          {pickLine(
            y.species,
            y.fullness < 20
              ? "hungry"
              : y.clean < 30
                ? "dirty"
                : y.fullness >= 80
                  ? "full"
                  : "greet",
            y.stage + y.dex,
          )}
          」
        </p>
        <Link
          href="/yokai"
          data-home-yokai-go
          className={cn(
            "mt-auto grid min-h-11 place-items-center rounded-xl text-sm font-black",
            status.hot
              ? "yk-cta-pulse bg-[#7a1c22] text-white hover:bg-[#93242c]"
              : "border border-[#c9a25c]/40 bg-black/30 text-[#e7c98a] hover:border-[#c9a25c]",
          )}
        >
          {status.cta}
        </Link>
      </section>
    </YokaiGlow>
  );
}

/** 요괴 마을 칸 겉: 금빛 테두리가 흐르고 반짝이가 떠다님(움직임 줄이기 설정이면 멈춤) */
function YokaiGlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="yk-glow relative h-full rounded-[1.4rem] p-[2px]">
      {children}
      {/* 반짝이는 테두리 모서리에만(글자 위에 안 겹치게) */}
      <span
        aria-hidden
        className="yk-spark"
        style={{ left: "-4px", top: "-6px" }}
      >
        ✦
      </span>
      <span
        aria-hidden
        className="yk-spark"
        style={{ right: "-4px", top: "40%", animationDelay: "1.1s" }}
      >
        ✦
      </span>
      <span
        aria-hidden
        className="yk-spark"
        style={{ left: "38%", bottom: "-8px", animationDelay: "2.2s" }}
      >
        ✧
      </span>
    </div>
  );
}
