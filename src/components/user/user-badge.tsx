import { cn } from "cn";
import { MarkImage } from "@/components/layout/mark-image";
import { StarIcon, MessageCircleHeartIcon } from "lucide-react";
import { displayMarkSrc, OPERATOR_MARK_SRC } from "@/lib/mark-assets";
import { CrownedFrame } from "@/components/honor/crowned-frame";
import { auraClassForSrc } from "@/lib/yokai-achievements";
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

export { OPERATOR_MARK_SRC };

function OperatorPill() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
      운영자
    </span>
  );
}

const SIZE = {
  sm: { mark: 28, nick: "text-sm", pad: "h-5 px-1.5 text-[10px]" },
  md: { mark: 34, nick: "text-sm", pad: "h-6 px-1.5 text-[11px]" },
  lg: { mark: 56, nick: "text-base", pad: "h-6 px-2 text-xs" },
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
        <span className="inline-flex items-center gap-0.5 rounded-full border border-[#c59b27]/45 bg-[#c59b27]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#f3d58a]">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증
        </span>
      ) : null}
      {openChat ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-400/35 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">
          <MessageCircleHeartIcon className="size-3" />
          오픈채팅 우수
        </span>
      ) : null}
    </span>
  ) : showExtras && user.isMaster ? (
        <OperatorPill />
      ) : showExtras && !staff && user.isDealerVerified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-[#c59b27]/45 bg-[#c59b27]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#f3d58a]">
          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
          인증
        </span>
      ) : null;

  const markSrc = displayMarkSrc(user);
  const markRing = user.isMaster
    ? "ring-2 ring-amber-400 shadow-sm"
    : user.isDealerVerified
      ? "ring-2 ring-amber-400 shadow-sm"
      : size === "lg"
        ? "ring-2 ring-white shadow-sm"
        : "ring-1 ring-border";

  if (size === "lg") {
    return (
      <span className={cn("flex max-w-full items-center gap-3", className)}>
        <CrownedFrame nickname={user.nickname} aura={auraClassForSrc(markSrc)}>
          <MarkImage
            src={markSrc}
            alt={user.isMaster ? "운영자 마크" : `${user.nickname} 마크`}
            size={spec.mark}
            frameClass={frameClass}
            effectClass={effectClass}
            className={markRing}
          />
        </CrownedFrame>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn("level-chip", spec.pad)}>
              Lv.{user.level}
            </span>
            {showNickname ? (
              <span className="min-w-0">
                <span className={cn("block truncate font-bold text-foreground", spec.nick)}>{user.nickname}</span>
                {title ? <span className="mt-0.5 block text-xs font-semibold text-[#C59B27]">{title}</span> : null}
              </span>
            ) : title ? (
              <span className="text-xs font-semibold text-[#C59B27]">{title}</span>
            ) : null}
          </span>
          {extraPills ? <span className="mt-1.5 flex">{extraPills}</span> : null}
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex max-w-full flex-wrap items-center gap-1.5", className)}>
      <CrownedFrame nickname={user.nickname} aura={auraClassForSrc(markSrc)}>
        <MarkImage
          src={markSrc}
          alt={user.isMaster ? "운영자 마크" : `${user.nickname} 마크`}
          size={spec.mark}
          frameClass={frameClass}
          effectClass={effectClass}
          className={user.isMaster ? "ring-2 ring-amber-400" : markRing}
        />
      </CrownedFrame>
      <span className={cn("level-chip", spec.pad)}>
        Lv.{user.level}
      </span>
      {showNickname ? (
        <span className="min-w-0">
          <span className={cn("block truncate font-semibold leading-tight text-foreground", spec.nick)}>
            {user.nickname}
          </span>
          {title ? (
            <span className="block text-[11px] font-semibold leading-tight text-[#C59B27]">{title}</span>
          ) : null}
        </span>
      ) : title ? (
        <span className="text-[11px] font-semibold text-[#C59B27]">{title}</span>
      ) : null}
      {extraPills}
    </span>
  );
}
