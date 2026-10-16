import { cn } from "cn";
import { MarkImage } from "@/components/layout/mark-image";
import { CrownedFrame } from "@/components/honor/crowned-frame";
import { auraClassForSrc } from "@/lib/yokai-achievements";
import { displayMarkSrc } from "@/lib/mark-assets";
import { memberRankTitle } from "@/lib/levels";
import { progressFromExp } from "@/lib/levels";

export type PublicProfile = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
  isAdmin: boolean;
  isMaster: boolean;
  attendanceStreak: number;
  /** 요괴 마을 도감을 다 모은 회원 */
  villageChief?: boolean;
};

/** sparkle: 오늘 칭호를 받은 날이면 마크가 반짝임 + 안내 */
export function PublicProfileCard({
  user,
  sparkle = false,
  riser = null,
}: {
  user: PublicProfile;
  sparkle?: boolean;
  /** 이번 주 급상승 회원이면(주간 한정 배지) */
  riser?: { label: string; change: number } | null;
}) {
  const rank = memberRankTitle(user);
  const { nextLevelExp, progressPercent } = progressFromExp(user.level, user.exp);
  const next = nextLevelExp ?? user.exp;
  return (
    <section id="profile" className="scroll-mt-28 rounded-2xl border border-border bg-[#1a1617] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <CrownedFrame nickname={user.nickname} aura={auraClassForSrc(displayMarkSrc(user))}>
          <div
            data-honor-sparkle={sparkle ? "on" : undefined}
            className={cn(
              user.isMaster
                ? "flex size-12 items-center justify-center overflow-hidden rounded-full bg-zinc-900 ring-2 ring-amber-400"
                : "flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted",
              sparkle && "honor-sparkle",
            )}
          >
            <MarkImage src={displayMarkSrc(user)} alt={user.isMaster ? "운영자 마크" : user.nickname} size={80} />
          </div>
        </CrownedFrame>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{user.nickname}</p>
          {user.isMaster ? <p className="mt-0.5 text-xs font-bold text-amber-700">운영자</p> : null}
          {user.villageChief ? (
            <p data-village-chief className="mt-0.5 inline-flex rounded-full bg-gradient-to-r from-[#ff5a5a]/25 via-[#ffd23a]/25 to-[#b06aff]/25 px-2 py-0.5 text-xs font-black text-[#ffe08a]">
              👑 요괴 마을 촌장
            </p>
          ) : null}
          {rank ? <p className="mt-0.5 text-xs font-semibold text-emerald-300">{rank}</p> : null}
          {sparkle ? <p className="mt-0.5 text-[11px] font-black text-[#f5d76e]">✨ 오늘 칭호를 받았어요!</p> : null}
          {riser ? (
            <p data-riser-badge className="mt-1 inline-flex rounded-full border border-orange-400/70 bg-orange-500/15 px-2 py-0.5 text-[11px] font-black text-orange-200">
              🔥 이번 주 급상승 · {riser.label} ▲{riser.change}
            </p>
          ) : null}
          {!user.isMaster && !user.isAdmin && user.isDealerVerified ? (
            <p className="mt-0.5 text-[11px] font-semibold text-amber-200">★ 인증</p>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          Lv.{user.level}
        </span>
      </div>
      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="경험치 진척도"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          경험치 {user.exp.toLocaleString()} / {next.toLocaleString()}
          <span className="ml-2">{progressPercent}%</span>
        </p>
      </div>
      <p className="mt-3 text-sm">
        보유 포인트{" "}
        <strong className="font-semibold text-foreground">{user.points.toLocaleString()} P</strong>
      </p>
      <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-3 py-2.5">
        <p className="text-sm font-semibold text-emerald-300">
          연속 출석 <strong className="text-base">{user.attendanceStreak.toLocaleString()}일</strong>
        </p>
      </div>
    </section>
  );
}
