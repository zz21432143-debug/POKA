import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { PublicProfileCard } from "@/components/user/public-profile-card";
import { HonorShelf } from "@/components/user/honor-shelf";
import { listHonorHistory } from "@/lib/pot-titles";
import { todayKstDate } from "@/lib/dates";
import { getWeeklyRiser } from "@/lib/home-rankings";

const kstDateOf = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 10);
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }): Promise<Metadata> {
  const { nickname } = await params;
  return { title: `${safeDecode(nickname)} 님의 프로필` };
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const decoded = safeDecode(nickname);
  const user = await prisma.user.findUnique({ where: { nickname: decoded } });
  if (!user || user.withdrawnAt) notFound();
  const viewer = await getCurrentUser().catch(() => null);
  const mine = viewer?.id === user.id;
  // 오늘(한국 날짜) 칭호를 받았으면 마크 반짝임
  const today = todayKstDate();
  const sparkle = (await listHonorHistory(user.id, 5).catch(() => [])).some((h) => kstDateOf(h.at) === today);
  // 이번 주 급상승 회원이면 배지(주간 한정)
  const weekly = await getWeeklyRiser().catch(() => null);
  const riser = weekly && weekly.nickname === user.nickname ? { label: weekly.label, change: weekly.change } : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">프로필</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          공개되는 정보는 닉네임·레벨·포인트·출석뿐입니다. 이메일 등 신상은 보이지 않습니다.
        </p>
      </header>
      <PublicProfileCard
        sparkle={sparkle}
        riser={riser}
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
      <HonorShelf userId={user.id} nickname={user.nickname} mine={mine} />
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
            내 정보
          </Link>
        ) : null}
        {viewer?.isMaster && !user.isMaster ? (
          <VerifyToggle nickname={user.nickname} verified={user.isDealerVerified} />
        ) : null}
      </div>
    </div>
  );
}
