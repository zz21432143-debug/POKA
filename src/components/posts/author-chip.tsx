import { UserBadge, AUTHOR_SELECT, type BadgeUser } from "@/components/user/user-badge";
import { NicknameMenu } from "@/components/user/nickname-menu";
import { isWithdrawnRecord, withdrawnDisplayName } from "@/lib/account-privacy";

export type PublicAuthor = BadgeUser | null;

export { AUTHOR_SELECT, UserBadge };
export { levelTitle as levelReward } from "@/components/user/user-badge";

export function ProfileBadges({
  isDealerVerified,
  level,
  isAdmin,
  attendanceStreak,
  nickname = "",
  profileMarkImageUrl = null,
  showLevel = true,
}: {
  isDealerVerified?: boolean;
  level: number;
  isAdmin?: boolean;
  attendanceStreak?: number;
  nickname?: string;
  profileMarkImageUrl?: string | null;
  showLevel?: boolean;
}) {
  return (
    <UserBadge
      user={{
        nickname,
        profileMarkImageUrl,
        level,
        isDealerVerified,
        isAdmin,
        attendanceStreak,
      }}
      size="md"
      showNickname={Boolean(nickname)}
      showExtras={showLevel}
    />
  );
}

export function AuthorChip({
  author,
  anonymous,
  size = "sm",
}: {
  author: PublicAuthor;
  anonymous: boolean;
  size?: "sm" | "md" | "lg";
}) {
  if (anonymous || !author) {
    return <span className="text-sm text-muted-foreground">익명</span>;
  }
  if (isWithdrawnRecord(author)) {
    return <span className="text-sm text-muted-foreground">{withdrawnDisplayName()}</span>;
  }
  return (
    <NicknameMenu nickname={author.nickname}>
      <UserBadge user={author} size={size} />
    </NicknameMenu>
  );
}
