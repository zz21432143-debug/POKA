import { MarkImage } from "@/components/layout/mark-image";
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
};

export function PublicProfileCard({ user }: { user: PublicProfile }) {
  const rank = memberRankTitle(user);
  const { nextLevelExp, progressPercent } = progressFromExp(user.level, user.exp);
  const next = nextLevelExp ?? user.exp;
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={
            user.isMaster
              ? "flex size-12 items-center justify-center overflow-hidden rounded-full bg-zinc-900 ring-2 ring-amber-400"
              : "flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted"
          }
        >
          <MarkImage src={displayMarkSrc(user)} alt={user.isMaster ? "운영자 마크" : user.nickname} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{user.nickname}</p>
          {user.isMaster ? <p className="mt-0.5 text-xs font-bold text-amber-700">운영자</p> : null}
          {rank ? <p className="mt-0.5 text-xs font-semibold text-emerald-800">{rank}</p> : null}
          {!user.isMaster && !user.isAdmin && user.isDealerVerified ? (
            <p className="mt-0.5 text-[11px] font-semibold text-amber-800">★ 인증</p>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
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
      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
        <p className="text-sm font-semibold text-emerald-950">
          연속 출석 <strong className="text-base">{user.attendanceStreak.toLocaleString()}일</strong>
        </p>
      </div>
    </section>
  );
}
