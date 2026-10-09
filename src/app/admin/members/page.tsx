import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { normalizeNickname } from "@/lib/nickname";
import { VerifyMembers } from "@/components/admin/verify-members";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) notFound();
  const { q } = await searchParams;
  const query = normalizeNickname(q ?? "");

  const members = await prisma.user.findMany({
    where: {
      isMaster: false,
      ...(query ? { nickname: { contains: query, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ isDealerVerified: "desc" }, { level: "desc" }, { nickname: "asc" }],
    take: 80,
    select: {
      nickname: true,
      level: true,
      isDealerVerified: true,
      isAdmin: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">인증 달기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          마스터 계정만 회원에게 골드 뱃지 「인증」을 달거나 뗄 수 있습니다. 닉네임으로 찾아 직접 설정하세요.
        </p>
        <Link href="/admin/banners" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary">
          배너 구좌 관리
        </Link>
      </header>
      <form className="flex gap-2" action="/admin/members" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="닉네임 검색"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          찾기
        </button>
      </form>
      <VerifyMembers members={members} />
    </div>
  );
}
