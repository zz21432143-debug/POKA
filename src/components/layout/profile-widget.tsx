import type { ViewerProfile } from "@/lib/profile";
import type { SwitchAccount } from "@/lib/switch-account";
import { MarkImage } from "@/components/layout/mark-image";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";

export { MarkImage };

export function ProfileWidget({
  profile,
  accounts = [],
  variant = "full",
}: {
  profile: ViewerProfile | null;
  accounts?: SwitchAccount[];
  variant?: "full" | "compact";
}) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm">
        <p className="text-muted-foreground">로그인하면 레벨, 출석, 글쓰기를 쓸 수 있습니다.</p>
        <Link
          href="/login"
          className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
        >
          로그인 / 가입
        </Link>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex min-h-11 items-center gap-2">
        <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{profile.nickname}</p>
          <p className="text-xs text-muted-foreground">LV.{profile.level}</p>
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
          <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={48} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{profile.nickname}</p>
          {profile.isMaster ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              ★ 마스터
            </p>
          ) : profile.isDealerVerified ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              ★ 인증 딜러
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">홀덤 커뮤니티 회원</p>
          )}
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
      {accounts.length > 0 ? <AccountSwitcher current={profile.nickname} accounts={accounts} /> : null}
      <div className="mt-3 grid grid-cols-1 gap-2">
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
        <LogoutButton />
      </div>
    </section>
  );
}
