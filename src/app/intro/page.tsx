import { prisma } from "@/lib/db";
import { MarkImage } from "@/components/layout/mark-image";
import { ProfileBadges } from "@/components/posts/author-chip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IntroPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ isDealerVerified: "desc" }, { level: "desc" }],
    take: 24,
    select: {
      nickname: true,
      profileMarkImageUrl: true,
      level: true,
      isDealerVerified: true,
      attendanceStreak: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">자기소개</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          POKA에 있는 딜러와 플레이어를 만나보세요.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {users.map((user) => (
          <li key={user.nickname}>
            <Link
              href={`/u/${encodeURIComponent(user.nickname)}`}
              className="touch-target flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/40"
            >
              <MarkImage src={user.profileMarkImageUrl} alt={user.nickname} size={48} />
              <div className="min-w-0">
                <p className="font-semibold">{user.nickname}</p>
                <ProfileBadges isDealerVerified={user.isDealerVerified} level={user.level} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.attendanceStreak ? `연속 출석 ${user.attendanceStreak}일` : "소개를 기다리고 있어요"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
