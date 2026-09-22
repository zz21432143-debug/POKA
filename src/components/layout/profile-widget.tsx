import { cn } from "cn";
import type { ViewerProfile } from "@/lib/profile";

export function MarkImage({
  src,
  alt,
  size = 32,
  className,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full", className)}
    />
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
      <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
        로그인 후 마크와 레벨이 표시됩니다.
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex min-h-11 items-center gap-2">
        <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{profile.nickname}</p>
          <p className="text-xs text-primary">Lv.{profile.level}</p>
        </div>
      </div>
    );
  }

  const nextLabel =
    profile.nextLevelExp == null
      ? "최고 레벨"
      : `다음 ${profile.nextLevelExp.toLocaleString()} EXP`;

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">내 프로필</p>
      <div className="mt-2 flex items-center gap-3">
        <MarkImage src={profile.profileMarkImageUrl} alt={profile.nickname} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.nickname}</p>
          <p className="text-sm text-muted-foreground">
            Lv.{profile.level}
            {profile.isDealerVerified ? " · 딜러 인증" : ""}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>경험치 {profile.exp.toLocaleString()}</span>
          <span>{profile.progressPercent}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="경험치 진척도"
          aria-valuenow={profile.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${profile.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{nextLabel}</p>
      </div>
    </section>
  );
}
