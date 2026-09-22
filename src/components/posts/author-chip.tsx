import { MarkImage } from "@/components/layout/profile-widget";

export type PublicAuthor = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
} | null;

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
    <span className="inline-flex min-h-11 items-center gap-2">
      <MarkImage src={author.profileMarkImageUrl} alt={author.nickname} size={28} />
      <span className="text-sm">
        <span className="font-medium">{author.nickname}</span>
        <span className="ml-1 text-xs text-primary">Lv.{author.level}</span>
      </span>
    </span>
  );
}
