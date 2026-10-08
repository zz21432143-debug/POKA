import type { ViewerProfile } from "@/lib/profile";
import { MarkImage } from "@/components/layout/mark-image";
import { LogoutButton } from "@/components/auth/logout-button";
import { todayKstDate } from "@/lib/dates";
import { displayMarkSrc } from "@/lib/mark-assets";
import { memberRankTitle } from "@/lib/levels";
import Link from "next/link";
import { NicknameMenu } from "@/components/user/nickname-menu";

export { MarkImage };

export function ProfileWidget({
  profile,
  variant = "full",
}: {
  profile: ViewerProfile | null;
  variant?: "full" | "compact";
}) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm">
        <p className="text-muted-foreground">로그인하면 레벨, 출석, 글쓰기를 쓸 수 있습니다.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
          >
            로그인
          </Link>
          <Link
            href="/login?tab=signup"
            className="flex min-h-11 items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary"
          >
            회원가입
          </Link>
        </div>
      </div>
    );
  }

  const rank = memberRankTitle(profile);
  const markSrc = displayMarkSrc(profile);

  if (variant === "compact") {
    return (
      <div className="flex min-h-11 items-center gap-2">
        <MarkImage src={markSrc} alt={profile.nickname} size={36} />
        <div className="min-w-0">
          <NicknameMenu nickname={profile.nickname}>
            <p className="truncate text-sm font-medium leading-tight">{profile.nickname}</p>
          </NicknameMenu>
          <p className="text-xs text-emerald-800">
            {rank ? `${rank} · ` : null}Lv.{profile.level}
          </p>
        </div>
      </div>
    );
  }

  const next = profile.nextLevelExp ?? profile.exp;
  const meHref = `/u/${encodeURIComponent(profile.nickname)}`;

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted">
          <MarkImage src={markSrc} alt={profile.nickname} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <NicknameMenu nickname={profile.nickname}>
            <p className="truncate text-base font-semibold">{profile.nickname}</p>
          </NicknameMenu>
          {rank ? (
            <p className="mt-0.5 text-xs font-semibold text-emerald-800">{rank}</p>
          ) : null}
          {profile.isMaster || profile.isAdmin ? null : profile.isDealerVerified ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              ★ 인증
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Lv.{profile.level}
        </span>
      </div>
      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="경험치 진척도"
          aria-valuenow={profile.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${profile.progressPercent}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          경험치 {profile.exp.toLocaleString()} / {next.toLocaleString()}
          <span className="ml-2">{profile.progressPercent}%</span>
        </p>
      </div>
      <p className="mt-3 text-sm">
        보유 포인트{" "}
        <strong className="font-semibold text-foreground">{profile.points.toLocaleString()} P</strong>
      </p>
      <AttendanceStreakCard
        streak={profile.attendanceStreak}
        lastAttendanceDate={profile.lastAttendanceDate}
      />
      <div className="mt-3 grid grid-cols-1 gap-2">
        {profile.isAdmin ? (
          <Link
            href="/admin"
            className="touch-target flex min-h-11 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            관리자 페이지
          </Link>
        ) : null}
        {profile.isMaster ? (
          <Link
            href="/admin/members"
            className="touch-target flex min-h-11 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            인증 달기
          </Link>
        ) : null}
        <Link
          href="/shop"
          className="touch-target flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          마크 상점
        </Link>
        <Link
          href={meHref}
          className="touch-target flex min-h-11 items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary hover:bg-emerald-50"
        >
          내 프로필 보기 →
        </Link>
        <Link
          href="/account"
          className="touch-target flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-semibold hover:bg-muted"
        >
          내 정보
        </Link>
        <LogoutButton />
      </div>
    </section>
  );
}

function AttendanceStreakCard({
  streak,
  lastAttendanceDate,
}: {
  streak: number;
  lastAttendanceDate: string | null;
}) {
  const checkedInToday = lastAttendanceDate === todayKstDate();
  const displayStreak = lastAttendanceDate ? streak : 0;
  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
      <p className="text-sm font-semibold text-emerald-950">
        연속 출석{" "}
        <strong className="text-base">{displayStreak.toLocaleString()}일</strong>
      </p>
      {checkedInToday ? (
        <p className="mt-0.5 text-[11px] text-emerald-800">오늘 출석 완료 · 내일도 이어 가세요</p>
      ) : (
        <Link
          href="/attendance"
          className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline"
        >
          출석체크 하러 가기 →
        </Link>
      )}
    </div>
  );
}
