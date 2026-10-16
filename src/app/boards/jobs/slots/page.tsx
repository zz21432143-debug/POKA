import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { CalendarDaysIcon, FlameIcon, PenSquareIcon, TrophyIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NewSlotsPill } from "@/components/jobs/new-slots-pill";
import { availableCounts, inRange, loadJobBoard } from "@/lib/job-board";
import { dayLabel } from "@/lib/job-events";
import { JOB_REGIONS, parseJobRegion } from "@/lib/job-status";
import { getCurrentUser } from "@/lib/current-user";
import { nowMs } from "@/lib/dates";
import { cn } from "cn";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string; d?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const region = parseJobRegion((await searchParams).region);
  const title = `${region ? `${region} ` : ""}홀덤 딜러 빈자리 · 날짜별 지원 딜러 구인`;
  return {
    title,
    description: `${region ? `${region} ` : ""}홀덤펍 지원 딜러 · 급구 빈자리를 날짜와 시간별로 한눈에. 쉬는 날 일할 곳을 바로 찾고 바로 연락하세요.`,
    alternates: { canonical: "/boards/jobs/slots" },
  };
}

const RANGES = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "tomorrow", label: "내일" },
  { key: "week", label: "이번 주" },
] as const;

/** 날짜별 빈자리 보드: 지원 딜러 · 급구 · 대회 공고를 「날짜 · 시간 · 인원」 줄로 */
export default async function JobSlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const region = parseJobRegion(params.region);
  const range = RANGES.some((r) => r.key === params.d) ? (params.d as string) : "all";
  const [board, avail, user] = await Promise.all([loadJobBoard(region), availableCounts(region), getCurrentUser().catch(() => null)]);
  const slots = board.slots.filter((s) => inRange(s.date, range, board.today));
  const days = [...new Set(slots.map((s) => s.date))];
  const qs = (next: { region?: string | null; d?: string }) => {
    const p = new URLSearchParams();
    const r = next.region === undefined ? region : next.region;
    const d = next.d ?? range;
    if (r) p.set("region", r);
    if (d !== "all") p.set("d", d);
    const s = p.toString();
    return `/boards/jobs/slots${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-3" data-job-slots>
      <header className="board-intro">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white">
          <CalendarDaysIcon className="size-6 text-[#ffcf4a]" />
          {region ? `${region} ` : ""}날짜별 빈자리
        </h1>
        <p className="mt-1.5 text-sm text-[#d6cdee]">지원 딜러 · 급구 · 대회 공고를 날짜와 시간별로 모았어요. 쉬는 날을 골라 바로 연락하세요.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <Link href="/boards/jobs/available" className={cn(buttonVariants({ size: "touch", variant: "outline" }), "gap-1.5")}>
            🙋 내가 가능한 날 등록
          </Link>
          <Link href={user ? "/boards/jobs/mine" : "/boards/jobs/apply/write"} className={cn(buttonVariants({ size: "touch" }), "gap-1.5")}>
            <PenSquareIcon className="size-4" />
            {user ? "내 공고 갱신 · 등록" : "빈자리 올리기"}
          </Link>
        </div>
      </header>

      <NewSlotsPill region={region} since={nowMs()} />

      {/* 날짜 범위 · 지역 */}
      <nav aria-label="날짜" className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={qs({ d: r.key })}
            aria-current={range === r.key ? "page" : undefined}
            className={cn(
              "touch-target inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-black",
              range === r.key ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]" : "border-white/20 bg-black/30 text-white",
            )}
          >
            {r.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="지역" className="card-scroller -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-1.5">
          <li>
            <Link href={qs({ region: null })} className={cn("touch-target inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-bold", !region ? "border-[#c9a25c] bg-[#c9a25c]/20 text-[#ffe08a]" : "border-white/15 text-zinc-300")}>
              전국
            </Link>
          </li>
          {JOB_REGIONS.map((r) => (
            <li key={r}>
              <Link href={qs({ region: r })} className={cn("touch-target inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-bold", region === r ? "border-[#c9a25c] bg-[#c9a25c]/20 text-[#ffe08a]" : "border-white/15 text-zinc-300")}>
                {r}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 대회 딜러: 기간 · 일자별 남은 인원 */}
      {board.tournaments.length ? (
        <section aria-label="대회 딜러 구인" className="grid gap-2">
          {board.tournaments.map((t) => (
            <Link key={t.id} href={`/posts/${t.id}`} data-job-tournament className="grid gap-1.5 rounded-2xl border-2 border-[#8c6bff]/60 bg-gradient-to-r from-[#2a1a52] to-[#1a1030] p-3 hover:border-[#b39dff]">
              <div className="flex flex-wrap items-center gap-2">
                <TrophyIcon className="size-5 text-[#ffcf4a]" />
                <b className="text-base text-white">{t.name}</b>
                <span className="rounded-full bg-black/40 px-2 text-xs font-bold text-[#e7dcff]">
                  {t.start ? dayLabel(t.start) : ""}
                  {t.end && t.end !== t.start ? ` ~ ${dayLabel(t.end)}` : ""}
                </span>
                {t.headcount ? <span className="rounded-full bg-[#ffcf4a]/20 px-2 text-xs font-black text-[#ffe08a]">딜러 {t.headcount}</span> : null}
                <span className="ml-auto text-xs text-[#c9b8ff]">{t.location}</span>
              </div>
              {t.days.length ? (
                <ul className="flex flex-wrap gap-1">
                  {t.days.map((d, i) => (
                    <li key={i} className="rounded-lg bg-black/35 px-2 py-0.5 text-xs font-bold text-white">
                      {dayLabel(d.date, false)}
                      {d.count ? ` · ${d.count}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {t.pay ? <p className="text-xs font-bold text-[#ffcf4a]">{t.pay}</p> : null}
            </Link>
          ))}
        </section>
      ) : null}

      {/* 날짜별 빈자리 */}
      {days.length ? (
        <div className="grid gap-3">
          {days.map((day) => {
            const list = slots.filter((s) => s.date === day);
            const people = avail.get(day) ?? 0;
            return (
              <section key={day} data-slot-day={day} aria-label={dayLabel(day)} className="overflow-hidden rounded-2xl border border-[#c9a25c]/35 bg-[#17120f]">
                <h2 className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#2a2017] px-3 py-2 text-base font-black text-white">
                  {day === board.today ? <span className="rounded-full bg-[#ff5d6c] px-2 text-xs text-white">오늘</span> : null}
                  {dayLabel(day)}
                  <span className="text-xs font-bold text-[#e7c98a]">빈자리 {list.length}곳</span>
                  {people ? <span className="ml-auto text-xs font-bold text-[#8eeaff]">🙋 이날 가능한 딜러 {people}명</span> : null}
                </h2>
                <ul className="divide-y divide-white/5">
                  {list.map((s, i) => (
                    <li key={`${s.postId}-${i}`}>
                      <Link href={`/posts/${s.postId}`} data-slot className="flex min-h-14 items-center gap-2.5 px-3 py-2 hover:bg-white/5">
                        <span className="w-12 shrink-0 text-center text-sm font-black tabular-nums text-[#ffcf4a]">{s.time ?? "협의"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            {s.kind === "URGENT" ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[#ff5d6c] px-1.5 text-[11px] font-black text-white">
                                <FlameIcon className="size-3" />
                                급구
                              </span>
                            ) : null}
                            {s.fresh ? <span className="rounded bg-emerald-500/25 px-1.5 text-[11px] font-black text-emerald-200">🆕 방금</span> : null}
                            <b className="truncate text-[15px] text-white">{s.company}</b>
                          </span>
                          <span className="block truncate text-xs text-[#c9c0b2]">
                            {[s.branch, s.location, s.pay].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          {s.count ? <b className="block text-sm text-white">👤 {s.count}</b> : null}
                          <span className="text-xs font-bold text-[#8eeaff]">지원 ›</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-zinc-300">
          {range === "all" ? "지금 올라온 빈자리가 없어요." : "이 날짜엔 빈자리가 없어요. 다른 날을 골라 보세요."}{" "}
          <Link href="/boards/jobs/available" className="font-bold text-[#8eeaff] underline">
            가능한 날을 등록
          </Link>
          하면 빈자리가 생길 때 알려 드려요.
        </p>
      )}

      {board.undated.length ? (
        <section aria-label="날짜 미정 공고" className="grid gap-1.5">
          <h2 className="text-sm font-black text-[#e7c98a]">날짜 미정 · 상시 공고</h2>
          <ul className="grid gap-1.5">
            {board.undated.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white hover:bg-white/5">
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="shrink-0 text-xs text-zinc-400">{p.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-400">
        💡 공고 올리는 분: 카톡 공고를 그대로 붙여넣으면 「10월 18일 (일) PM 2:00 - 2명」 같은 줄이 자동으로 빈자리가 돼요. 다 찬 줄은 끝에 「마감」만 적으면 빠지고, 지난 날짜는 저절로 사라져요.
      </p>
    </div>
  );
}
