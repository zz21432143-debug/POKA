import { cn } from "cn";
import { MarkImage } from "@/components/layout/mark-image";
import { StarIcon, MessageCircleHeartIcon } from "lucide-react";
import { levelTitle, memberRankTitle } from "@/lib/levels";

export { levelTitle };

export type BadgeUser = {
  nickname: string;
  withdrawnAt?: Date | string | null;
  profileMarkImageUrl: string | null;
  level: number;
  isDealerVerified?: boolean;
  isAdmin?: boolean;
  isMaster?: boolean;
  attendanceStreak?: number;
  equippedFrameId?: string | null;
  equippedEffectId?: string | null;
  equippedFrame?: { cssClass: string | null } | null;
  equippedEffect?: { cssClass: string | null } | null;
};

export const AUTHOR_SELECT = {
  nickname: true,
  withdrawnAt: true,
  profileMarkImageUrl: true,
  level: true,
  isDealerVerified: true,
  isAdmin: true,
  isMaster: true,
  attendanceStreak: true,
  equippedFrameId: true,
  equippedEffectId: true,
  equippedFrame: { select: { cssClass: true } },
  equippedEffect: { select: { cssClass: true } },
} as const;

export function isOpenChatStar(user: Pick<BadgeUser, "level" | "attendanceStreak">) {
  return user.level >= 8 || (user.attendanceStreak ?? 0) >= 7;
}

export const OPERATOR_MARK_SRC = "/marks/operator.svg";

function OperatorPill() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
      운영자
    </span>
  );
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
  const title = memberRankTitle(user);
  const openChat = isOpenChatStar(user);
  const extras = size !== "sm";
  const staff = Boolean(user.isMaster || user.isAdmin);

  const extraPills = showExtras && extras ? (
    <span className="inline-flex flex-wrap items-center gap-1">
      {user.isMaster ? <OperatorPill /> : null}
      {!staff && user.isDealerVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증
        </span>
      ) : null}
      {openChat ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
          <MessageCircleHeartIcon className="size-3" />
          오픈채팅 우수
        </span>
      ) : null}
    </span>
  ) : showExtras && user.isMaster ? (
        <OperatorPill />
      ) : showExtras && !staff && user.isDealerVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증
        </span>
      ) : null;

  if (size === "lg") {
    return (
      <span className={cn("flex max-w-full items-center gap-3", className)}>
        {user.isMaster ? (
          <MarkImage src={OPERATOR_MARK_SRC} alt="운영자 마크" size={spec.mark} className="ring-2 ring-amber-400 shadow-sm" />
        ) : null}
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
              <span className="min-w-0">
                <span className={cn("block truncate font-bold text-foreground", spec.nick)}>{user.nickname}</span>
                {title ? <span className="mt-0.5 block text-xs font-semibold text-emerald-800">{title}</span> : null}
              </span>
            ) : title ? (
              <span className="text-xs font-semibold text-emerald-800">{title}</span>
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
      {user.isMaster ? (
        <MarkImage src={OPERATOR_MARK_SRC} alt="운영자 마크" size={spec.mark} className="ring-2 ring-amber-400" />
      ) : null}
      <MarkImage
        src={user.profileMarkImageUrl}
        alt={`${user.nickname} 마크`}
        size={spec.mark}
        frameClass={frameClass}
        effectClass={effectClass}
        className={user.isDealerVerified ? "ring-2 ring-amber-400" : "ring-1 ring-border"}
      />
      {showNickname ? (
        <span className="min-w-0">
          <span className={cn("block truncate font-semibold leading-tight text-foreground", spec.nick)}>
            {user.nickname}
          </span>
          {title ? (
            <span className="block text-[11px] font-semibold leading-tight text-emerald-800">{title}</span>
          ) : null}
        </span>
      ) : title ? (
        <span className="text-[11px] font-semibold text-emerald-800">{title}</span>
      ) : null}
      {extraPills}
    </span>
  );
}
