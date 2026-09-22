import { MarkImage } from "@/components/layout/mark-image";

export type PublicAuthor = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  isDealerVerified?: boolean;
} | null;

export const AUTHOR_SELECT = {
  nickname: true,
  profileMarkImageUrl: true,
  level: true,
  isDealerVerified: true,
} as const;

export function levelReward(level: number) {
  if (level >= 8) return "에이스";
  if (level >= 4) return "헌터";
  if (level >= 2) return "라이브";
  return null;
}

export function ProfileBadges({
  isDealerVerified,
  level,
  showLevel = true,
}: {
  isDealerVerified?: boolean;
  level: number;
  showLevel?: boolean;
}) {
  const reward = levelReward(level);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {isDealerVerified ? (
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          ★ 인증 딜러
        </span>
      ) : null}
      {reward ? (
        <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
          {reward}
        </span>
      ) : null}
      {showLevel ? <span className="text-xs text-primary">Lv.{level}</span> : null}
    </span>
  );
}

export function AuthorChip({
  author,
  anonymous,
}: {
  author: PublicAuthor;
  anonymous: boolean;
}) {
  if (anonymous || !author) {
    return <span className="text-sm text-muted-foreground">익명</span>;
  }
  return (
    <span className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-1.5">
      <MarkImage src={author.profileMarkImageUrl} alt={author.nickname} size={28} />
      <span className="text-sm font-medium">{author.nickname}</span>
      <ProfileBadges isDealerVerified={author.isDealerVerified} level={author.level} />
    </span>
  );
}
