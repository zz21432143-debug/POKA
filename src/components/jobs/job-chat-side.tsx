import Link from "@/components/ui/link";
import { addDays } from "@/lib/job-events";
import { loadJobBoard } from "@/lib/job-board";
import { JOB_KINDS } from "@/lib/nav";
import type { JobRegion } from "@/lib/job-status";

/** PC 오픈채팅 오른쪽 칸: 오늘 · 내일 빈자리 요약 · 다가오는 빈자리 · 바로 가기 */
export async function JobChatSide({ region, slug, loggedIn }: { region: JobRegion | null; slug: string; loggedIn: boolean }) {
  const board = await loadJobBoard(region).catch(() => null);
  const today = board?.today ?? "";
  const tomorrow = today ? addDays(today, 1) : "";
  const todayCount = board?.slots.filter((s) => s.date === today).length ?? 0;
  const tomorrowCount = board?.slots.filter((s) => s.date === tomorrow).length ?? 0;
  const next = board?.slots.slice(0, 5) ?? [];
  const q = region ? `region=${encodeURIComponent(region)}` : "";
  return (
    <aside data-job-chat-side className="sticky top-20 hidden flex-col gap-3 xl:flex">
      <section className="rounded-2xl border border-white/10 bg-[#15100c] p-3">
        <p className="text-sm font-black text-[#e7c98a]">📅 {region ?? "전국"} 빈자리</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href={`/boards/jobs/slots?d=today${q ? `&${q}` : ""}`} className="rounded-xl bg-white/5 px-2 py-2 text-center">
            <b className="block text-2xl font-black text-[#ffcf4a]">{todayCount}</b>
            <span className="text-xs text-zinc-300">오늘</span>
          </Link>
          <Link href={`/boards/jobs/slots${q ? `?${q}` : ""}`} className="rounded-xl bg-white/5 px-2 py-2 text-center">
            <b className="block text-2xl font-black text-white">{tomorrowCount}</b>
            <span className="text-xs text-zinc-300">내일</span>
          </Link>
        </div>
        {next.length ? (
          <ul className="mt-2 grid gap-1">
            {next.map((s, i) => (
              <li key={`${s.postId}-${i}`}>
                <Link href={`/posts/${s.postId}`} className="flex gap-1.5 truncate rounded-lg px-1.5 py-1 text-[13px] text-zinc-200 hover:bg-white/5">
                  <b className="shrink-0 text-[#ffcf4a]">
                    {Number(s.date.slice(5, 7))}/{Number(s.date.slice(8))}
                  </b>
                  <span className="truncate">
                    {s.company} {s.time ?? ""} {s.count ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">다가오는 빈자리가 아직 없어요.</p>
        )}
        {todayCount === 0 ? (
          <Link href="/boards/jobs/available" data-side-alert className="mt-2 block rounded-xl bg-[#fee500] px-2 py-2 text-center text-sm font-black text-[#1d1d1d]">
            🔔 빈자리 생기면 알림 받기
          </Link>
        ) : null}
        <Link href={`/boards/jobs/slots${q ? `?${q}` : ""}`} className="mt-2 block text-center text-xs font-bold text-[#e7c98a] underline">
          날짜별로 전부 보기
        </Link>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#15100c] p-3">
        <p className="text-sm font-black text-[#e7c98a]">💬 다른 구인 채팅방</p>
        <ul className="mt-2 grid gap-1">
          {Object.entries(JOB_KINDS)
            .filter(([s]) => s !== slug)
            .map(([s, v]) => (
              <li key={s}>
                <Link href={`/boards/jobs/${s}${q ? `?${q}` : ""}`} className="block rounded-lg px-1.5 py-1 text-[13px] text-zinc-200 hover:bg-white/5">
                  {v.title}
                </Link>
              </li>
            ))}
        </ul>
      </section>
      {loggedIn ? (
        <Link href="/boards/jobs/mine" className="rounded-2xl border border-[#fee500]/40 bg-[#fee500]/10 p-3 text-sm font-black text-[#fee500]">
          📋 내 공고 관리 · 매장 로고 · 줄 마감 →
        </Link>
      ) : null}
    </aside>
  );
}
