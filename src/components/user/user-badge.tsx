import { cn } from "cn";
import { MarkImage } from "@/components/layout/mark-image";
import { ShieldIcon, StarIcon, MessageCircleHeartIcon } from "lucide-react";

export type BadgeUser = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  isDealerVerified?: boolean;
  isAdmin?: boolean;
  attendanceStreak?: number;
  equippedFrameId?: string | null;
  equippedEffectId?: string | null;
  equippedFrame?: { cssClass: string | null } | null;
  equippedEffect?: { cssClass: string | null } | null;
};

export const AUTHOR_SELECT = {
  nickname: true,
  profileMarkImageUrl: true,
  level: true,
  isDealerVerified: true,
  isAdmin: true,
  attendanceStreak: true,
  equippedFrameId: true,
  equippedEffectId: true,
  equippedFrame: { select: { cssClass: true } },
  equippedEffect: { select: { cssClass: true } },
} as const;

export function levelTitle(level: number) {
  if (level >= 8) return "에이스";
  if (level >= 4) return "헌터";
  if (level >= 2) return "라이브";
  return null;
}

export function isOpenChatStar(user: Pick<BadgeUser, "level" | "attendanceStreak">) {
  return user.level >= 8 || (user.attendanceStreak ?? 0) >= 7;
}

const SIZE = {
  sm: { mark: 28, nick: "text-sm", pad: "h-6 px-1.5 text-[11px]" },
  md: { mark: 32, nick: "text-sm", pad: "h-6 px-2 text-[11px]" },
  lg: { mark: 48, nick: "text-base", pad: "h-7 px-2 text-xs" },
} as const;

export function UserBadge({
  user,
  size = "sm",
  showNickname = true,
  showExtras = true,
  className,
}: {
  user: BadgeUser;
  size?: keyof typeof SIZE;
  showNickname?: boolean;
  showExtras?: boolean;
  className?: string;
}) {
  const spec = SIZE[size];
  const frameClass = user.equippedFrame?.cssClass;
  const effectClass = user.equippedEffect?.cssClass;
  const title = levelTitle(user.level);
  const openChat = isOpenChatStar(user);
  const extras = size !== "sm";

  const extraPills = showExtras && extras ? (
    <span className="inline-flex flex-wrap items-center gap-1">
      {user.isDealerVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증 딜러
        </span>
      ) : null}
      {user.isAdmin ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
          <ShieldIcon className="size-3" />
          관리자
        </span>
      ) : null}
      {openChat ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
          <MessageCircleHeartIcon className="size-3" />
          오픈채팅 우수
        </span>
      ) : null}
      {title ? (
        <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {title}
        </span>
      ) : null}
    </span>
  ) : showExtras && user.isDealerVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증
        </span>
      ) : null;

  if (size === "lg") {
    return (
      <span className={cn("flex max-w-full items-center gap-3", className)}>
        <MarkImage
          src={user.profileMarkImageUrl}
          alt={`${user.nickname} 마크`}
          size={spec.mark}
          frameClass={frameClass}
          effectClass={effectClass}
          className={user.isDealerVerified ? "ring-2 ring-amber-400 shadow-sm" : "ring-2 ring-white shadow-sm"}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex shrink-0 items-center rounded-md bg-emerald-600 font-bold text-white", spec.pad)}>
              Lv.{user.level}
            </span>
            {showNickname ? (
              <span className={cn("truncate font-bold text-foreground", spec.nick)}>{user.nickname}</span>
            ) : null}
          </span>
          {extraPills ? <span className="mt-1.5 flex">{extraPills}</span> : null}
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex max-w-full flex-wrap items-center gap-1.5", className)}>
      <span className={cn("inline-flex shrink-0 items-center rounded-md bg-emerald-600 font-bold text-white", spec.pad)}>
        Lv.{user.level}
      </span>
      <MarkImage
        src={user.profileMarkImageUrl}
        alt={`${user.nickname} 마크`}
        size={spec.mark}
        frameClass={frameClass}
        effectClass={effectClass}
        className={user.isDealerVerified ? "ring-2 ring-amber-400" : "ring-1 ring-border"}
      />
      {showNickname ? (
        <span className={cn("truncate font-semibold text-foreground", spec.nick)}>{user.nickname}</span>
      ) : null}
      {extraPills}
    </span>
  );
}
