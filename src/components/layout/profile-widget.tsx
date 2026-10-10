import type { ViewerProfile } from "@/lib/profile";
import { MarkImage } from "@/components/layout/mark-image";
import { LogoutButton } from "@/components/auth/logout-button";
import { todayKstDate } from "@/lib/dates";
import { displayMarkSrc } from "@/lib/mark-assets";
import { CrownedFrame } from "@/components/honor/crowned-frame";
import { auraClassForSrc } from "@/lib/yokai-achievements";
import { memberRankTitle } from "@/lib/levels";
import Link from "next/link";
import { NicknameMenu } from "@/components/user/nickname-menu";
export { MarkImage };

function ProfileAction({
  href,
  children,
  tone = "plain",
}: {
  href: string;
  children: string;
  tone?: "plain" | "green" | "gold";
}) {
  return (
    <Link
      href={href}
      className={
        tone === "green"
          ? "btn-3d-green touch-target flex min-h-12 items-center justify-center rounded-xl text-base font-semibold"
          : tone === "gold"
            ? "btn-3d-gold touch-target flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold"
            : "btn-3d touch-target flex min-h-12 items-center justify-center rounded-xl text-base font-semibold text-[#2b1810]"
      }
    >
      {children}
    </Link>
  );
}

export function ProfileWidget({
  profile,
  variant = "full",
}: {
  profile: ViewerProfile | null;
  variant?: "full" | "compact";
}) {
  if (!profile) {
    return (
      <div className="profile-panel rounded-[1.35rem] p-4 text-sm">
        <p className="rounded-xl bg-[#2a2017] px-3 py-2.5 text-center text-sm font-semibold text-white">
          로그인이 필요합니다
        </p>
        <p className="mt-2 text-center text-sm leading-6 text-[#D1D5DB]">
          레벨, 출석, 글쓰기는 로그인 후 이용할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href="/api/auth/kakao?intent=login&next=%2F"
            className="btn-3d-gold touch-target flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold"
          >
            카카오 로그인
          </a>
          <a
            href="/api/auth/google?intent=login&next=%2F"
            className="btn-3d touch-target flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-[#2b271f]"
          >
            구글 로그인
          </a>
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-[#9CA3AF]">
          처음이신가요?
          <Link
            href="/login?tab=signup"
            className="touch-target inline-flex min-h-9 items-center font-semibold text-primary hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    );
  }

  const rank = memberRankTitle(profile);
  const markSrc = displayMarkSrc(profile);

  if (variant === "compact") {
    return (
      <div className="flex min-h-11 items-center gap-2">
        <CrownedFrame nickname={profile.nickname} aura={auraClassForSrc(markSrc)}>
          <MarkImage src={markSrc} alt={profile.nickname} size={36} />
        </CrownedFrame>
        <div className="min-w-0">
          <NicknameMenu nickname={profile.nickname}>
            <p className="truncate text-sm font-medium leading-tight">{profile.nickname}</p>
          </NicknameMenu>
          <p className="text-xs text-[#c9a25c]">
            {rank ? `${rank} · ` : null}Lv.{profile.level}
          </p>
        </div>
      </div>
    );
  }

  const next = profile.nextLevelExp ?? profile.exp;
  const meHref = `/u/${encodeURIComponent(profile.nickname)}`;

  return (
    <section className="profile-panel rounded-[1.35rem] px-4 pt-4 pb-1">
      <div className="flex items-center gap-3">
        <CrownedFrame nickname={profile.nickname} aura={auraClassForSrc(markSrc)}>
          <MarkImage src={markSrc} alt={profile.nickname} size={64} />
        </CrownedFrame>
        <div className="min-w-0 flex-1">
          <NicknameMenu nickname={profile.nickname}>
            <p className="truncate text-base font-bold text-white">{profile.nickname}</p>
          </NicknameMenu>
          {rank ? (
            <p className="mt-0.5 text-xs font-semibold text-[#C59B27]">{rank}</p>
          ) : null}
          {profile.isMaster || profile.isAdmin ? null : profile.isDealerVerified ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              ★ 인증
            </p>
          ) : null}
        </div>
        <span className="level-chip h-6 px-2 text-[11px]">
          Lv.{profile.level}
        </span>
      </div>
      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#2a2224]"
          role="progressbar"
          aria-label="경험치 진척도"
          aria-valuenow={profile.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${profile.progressPercent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-[#9CA3AF]">
          경험치 {profile.exp.toLocaleString()} / {next.toLocaleString()}
          <span className="ml-2">{profile.progressPercent}%</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-[#E5E7EB]">
        보유 포인트{" "}
        <strong className="font-bold text-white">{profile.points.toLocaleString()} P</strong>
      </p>
      <AttendanceStreakCard
        streak={profile.attendanceStreak}
        lastAttendanceDate={profile.lastAttendanceDate}
      />
      <div className="mt-3 flex flex-col gap-2 pb-3">
        {profile.isAdmin ? <ProfileAction href="/admin">관리자 페이지</ProfileAction> : null}
        {profile.isMaster ? <ProfileAction href="/admin/members">인증 달기</ProfileAction> : null}
        <ProfileAction href="/shop" tone="green">
          마크 상점
        </ProfileAction>
        <ProfileAction href={meHref} tone="green">
          내 프로필 보기 →
        </ProfileAction>
        <ProfileAction href="/account">내 정보</ProfileAction>
        <LogoutButton variant="raised" />
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
    <div className="mt-2.5 rounded-xl bg-[#241c1e] px-3 py-2">
      <p className="text-sm font-semibold text-white">
        연속 출석{" "}
        <strong className="text-[#C59B27]">{displayStreak.toLocaleString()}일</strong>
      </p>
      {checkedInToday ? (
        <p className="mt-0.5 text-xs text-[#9CA3AF]">오늘 출석 완료 · 내일도 이어 가세요</p>
      ) : (
        <Link
          href="/attendance"
          className="mt-0.5 inline-flex min-h-8 items-center text-[13px] font-semibold text-primary hover:underline"
        >
          출석체크 하러 가기 →
        </Link>
      )}
    </div>
  );
}
