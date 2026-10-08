import { notFound } from "next/navigation";
import Link from "next/link";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { PublicProfileCard } from "@/components/user/public-profile-card";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const decoded = decodeURIComponent(nickname);
  const user = await prisma.user.findUnique({ where: { nickname: decoded } });
  if (!user || user.withdrawnAt) notFound();
  const viewer = await getCurrentUser().catch(() => null);
  const mine = viewer?.id === user.id;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">프로필</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          공개되는 정보는 닉네임·레벨·포인트·출석뿐입니다. 이메일 등 신상은 보이지 않습니다.
        </p>
      </header>
      <PublicProfileCard
        user={{
          nickname: user.nickname,
          profileMarkImageUrl: user.profileMarkImageUrl,
          level: user.level,
          exp: user.exp,
          points: user.points,
          isDealerVerified: user.isDealerVerified,
          isAdmin: user.isAdmin,
          isMaster: user.isMaster,
          attendanceStreak: user.attendanceStreak,
        }}
      />
      <div className="flex flex-col gap-2">
        <Link
          href={`/u/${encodeURIComponent(user.nickname)}/posts`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
        >
          작성 글 보기
        </Link>
        {mine ? (
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-semibold"
          >
            내 정보·닉네임 변경
          </Link>
        ) : null}
        {viewer?.isMaster && !user.isMaster ? (
          <VerifyToggle nickname={user.nickname} verified={user.isDealerVerified} />
        ) : null}
      </div>
    </div>
  );
}
