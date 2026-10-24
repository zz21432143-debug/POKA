import Link from "@/components/ui/link";
import { getCurrentUser } from "@/lib/current-user";
import { todayKstDate } from "@/lib/dates";
import { liveStreak } from "@/lib/attendance";
import { memberRankTitle } from "@/lib/levels";
import { ATTENDANCE_POINTS, nextStreakBonus } from "@/lib/rewards";
import { cn } from "cn";
import { HomeAlertPrompt } from "@/components/home/home-alert-prompt";

/**
 * 홈 「내 상태」(로그인 회원만): 레벨 · 경험치 막대 · 포인트 · 연속 출석 · 출석 버튼(휴대폰은 두 줄). 아래에 알림 켜기 권유.
 * 매일 오는 이유(출석 · 포인트 · 경험치)가 홈에서 바로 보이게 — 비회원에게는 안 보임.
 */
export async function HomeMyStatus() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const today = todayKstDate();
  const checked = user.lastAttendanceDate === today;
  const streak = liveStreak(user, today);
  // 다음 연속 출석 보너스(오늘 안 했으면 남은 날에 오늘 포함)
  const bonus = nextStreakBonus(streak);
  const rank = memberRankTitle(user);
  const pct = Math.max(0, Math.min(100, user.progressPercent));
  return (
    <>
    <section aria-label="내 상태" data-home-my-status className="lounge-card flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-3 py-1.5 sm:px-4">
      <Link href={`/u/${encodeURIComponent(user.nickname)}`} className="grid min-w-0 basis-full gap-0.5 sm:basis-auto sm:min-w-[12rem] sm:flex-1">
        <span className="flex items-baseline gap-1.5 text-sm">
          <b className="shrink-0 font-black text-[#f3d9a4]">Lv.{user.level}</b>
          {rank ? <span className="truncate text-xs font-bold text-[#c9a25c]">{rank}</span> : null}
          <span className="ml-auto shrink-0 text-[11px] text-zinc-400 tabular-nums">경험치 {pct}%</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-[#2a2224]" role="progressbar" aria-label="경험치" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span className="block h-full rounded-full bg-[#c9a25c]" style={{ width: `${pct}%` }} />
        </span>
      </Link>
      <Link href="/shop" className="shrink-0 text-sm font-black text-white tabular-nums" title="포인트 상점">
        {user.points.toLocaleString("ko-KR")}P
      </Link>
      <span className="shrink-0 text-sm font-bold text-orange-300 tabular-nums" title={bonus ? `${bonus.label} 보너스 +${bonus.points}P까지 ${bonus.daysLeft}일` : undefined}>🔥 연속 {streak}일</span>
      <Link
        href="/attendance"
        data-my-status-attend={checked ? "done" : "todo"}
        className={cn(
          "ml-auto inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-black sm:ml-0",
          checked ? "border border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : "bg-[#ffcf4a] text-[#2a1400]",
        )}
      >
        {checked ? "✅ 출석 완료" : `출석하기 +${ATTENDANCE_POINTS}P`}
      </Link>
      {bonus ? (
        <p className="basis-full text-[11px] text-zinc-400 sm:hidden">
          {bonus.label} 보너스 +{bonus.points.toLocaleString("ko-KR")}P까지 {bonus.daysLeft}일{checked ? " 남았어요" : "(오늘 출석 포함)"}
        </p>
      ) : null}
    </section>
    {/* 매일 알림을 아직 안 켠 기기에만 한 줄 권유 */}
    <HomeAlertPrompt />
    </>
  );
}
