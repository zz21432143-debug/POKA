import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { getCurrentUser } from "@/lib/current-user";
import { RARITY_LABEL, STARTERS, YOKAI, YOKAI_BACKGROUNDS, YOKAI_ORDER, yokaiImage } from "@/lib/yokai";
import { yokaiHome, yokaiPublic } from "@/lib/yokai-server";

const bar = (value: number, max: number, color: string) => (
  <div className="h-2 overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
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
      {y ? <span className="text-xs font-bold text-[#e7c98a] tabular-nums">도감 {y.dex}/{total}</span> : <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-white">NEW</span>}
      <Link href="/yokai" className="ml-auto inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a]">
        마을로 가기
        <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );

  if (!y) {
    return (
      <section aria-label="요괴 마을" data-home-yokai="intro" className="lounge-card grid gap-3 rounded-[1.35rem] p-3 sm:p-4">
        {head}
        <p className="text-sm text-[#d1c7b5]">첫 요괴를 골라 키우고, 사이트 활동으로 새 요괴를 만나 보세요. 전설의 구미호와 염라대왕도 기다려요.</p>
        <div className="grid grid-cols-5 items-end gap-2">
          {STARTERS.map((s) => (
            <div key={s} className="grid justify-items-center gap-0.5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
              <img src={yokaiImage(s, 1)} alt={YOKAI[s].name} className="aspect-square w-full max-w-24 object-contain" />
              <span className="text-xs font-bold text-white">{YOKAI[s].name}</span>
            </div>
          ))}
          {(["gumiho", "yeomra"] as const).map((s) => (
            <div key={s} className="grid justify-items-center gap-0.5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- 전설은 실루엣 */}
              <img src={yokaiImage(s, 5)} alt="" className="aspect-square w-full max-w-24 object-contain opacity-40 brightness-0" />
              <span className="text-[11px] font-bold text-[#f5d76e]">전설 ???</span>
            </div>
          ))}
        </div>
        <Link
          href={user ? "/yokai" : "/login?next=%2Fyokai"}
          data-home-yokai-start
          className="grid min-h-11 place-items-center rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c]"
        >
          {user ? "첫 요괴 고르러 가기" : "로그인하고 요괴 키우기"}
        </Link>
      </section>
    );
  }

  const full = Boolean(y.feedAt);
  const status = y.newcomers.length
    ? { text: `✨ 새 요괴 ${y.newcomers.length}마리가 찾아왔어요!`, cta: "만나러 가기", hot: true }
    : y.fullness < 30
      ? { text: `🍙 ${y.name}가 배고파해요`, cta: "밥 주러 가기", hot: true }
      : y.feedsLeft > 0 && !full
        ? { text: `🍙 오늘 밥이 ${y.feedsLeft}번 남았어요`, cta: "밥 주러 가기", hot: true }
        : full && y.feedsLeft > 0
          ? { text: "배불러요 · 조금 뒤에 또 먹을 수 있어요", cta: "요괴 마을 가기", hot: false }
          : { text: "오늘 밥은 다 줬어요 · 출석 · 퀴즈로 더 받을 수 있어요", cta: "요괴 마을 가기", hot: false };

  return (
    <section aria-label="요괴 마을" data-home-yokai="mine" className="lounge-card grid gap-3 rounded-[1.35rem] p-3 sm:p-4">
      <style>{`@keyframes hy-bob{50%{transform:translateY(-5px)}}`}</style>
      {head}
      <div className="grid grid-cols-[112px_1fr] gap-3 sm:grid-cols-[150px_1fr]">
        <Link href="/yokai" aria-label={`${y.name} 보러 가기`} className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#c9a25c]/30" style={{ background: YOKAI_BACKGROUNDS[y.bg].css }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
          <img src={yokaiImage(y.species, y.stage)} alt="" className="w-[82%] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.6)]" style={{ animation: "hy-bob 2.4s ease-in-out infinite" }} />
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
            {y.next ? (
              <>
                <span className="flex justify-between">
                  다음 진화 <span className="tabular-nums">{y.next.have}/{y.next.need}</span>
                </span>
                {bar(y.next.have, y.next.need, "#c9a25c")}
              </>
            ) : (
              <span className="font-bold text-[#f5d76e]">✨ 최종 진화 완료</span>
            )}
          </div>
          <p data-home-yokai-status className={cn("text-xs font-bold", status.hot ? "text-[#f3d9a4]" : "text-zinc-400")}>
            {status.text}
          </p>
        </div>
      </div>
      {y.owned.length > 1 ? (
        <div className="flex items-center gap-1 overflow-hidden" aria-label="내 요괴들">
          {y.owned.map((o) => (
            // eslint-disable-next-line @next/next/no-img-element -- 가진 요괴
            <img key={o.species} src={yokaiImage(o.species, o.stage)} alt={YOKAI[o.species].name} title={YOKAI[o.species].name} className={cn("size-9 shrink-0 rounded-lg bg-black/30 object-contain", o.species === y.species && "ring-1 ring-[#e7c98a]")} />
          ))}
          {y.dex > y.owned.length ? <span className="text-xs text-zinc-400">+{y.dex - y.owned.length}</span> : null}
        </div>
      ) : null}
      <Link
        href="/yokai"
        data-home-yokai-go
        className={cn(
          "grid min-h-11 place-items-center rounded-xl text-sm font-black",
          status.hot ? "bg-[#7a1c22] text-white hover:bg-[#93242c]" : "border border-[#c9a25c]/40 bg-black/30 text-[#e7c98a] hover:border-[#c9a25c]",
        )}
      >
        {status.cta}
      </Link>
    </section>
  );
}
