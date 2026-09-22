import type { ViewerProfile } from "@/lib/profile";
import { ProfileBadges } from "@/components/posts/author-chip";
import { MarkImage } from "@/components/layout/mark-image";
import Link from "next/link";

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
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        로그인 후 레벨과 경험치가 표시됩니다.
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex min-h-11 items-center gap-2">
        <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{profile.nickname}</p>
          <ProfileBadges
            isDealerVerified={profile.isDealerVerified}
            level={profile.level}
          />
        </div>
      </div>
    );
  }

  const next = profile.nextLevelExp ?? profile.exp;
  const meHref = `/u/${encodeURIComponent(profile.nickname)}`;

  return (
    <section className="navy-panel overflow-hidden rounded-2xl p-4 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/20">
          <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{profile.nickname}</p>
          <p className="text-xs text-white/70">오늘도 성장 중인 딜러</p>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
          LV.{profile.level}
        </span>
      </div>
      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-label="경험치 진척도"
          aria-valuenow={profile.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${profile.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-white/70">
          경험치 {profile.exp.toLocaleString()} / {next.toLocaleString()}
          <span className="ml-2">{profile.progressPercent}%</span>
        </p>
      </div>
      <Link
        href={meHref}
        className="touch-target mt-4 flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-sm font-medium hover:bg-white/10"
      >
        내 프로필 보기 →
      </Link>
      {profile.isAdmin ? (
        <Link
          href="/admin/banners"
          className="mt-2 block text-center text-[11px] text-white/60 hover:text-white"
        >
          관리자 · 배너 구좌
        </Link>
      ) : null}
    </section>
  );
}
