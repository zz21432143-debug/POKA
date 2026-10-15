import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { normalizeNickname } from "@/lib/nickname";
import { VerifyMembers } from "@/components/admin/verify-members";
import { ForceNickname } from "@/components/admin/force-nickname";
import { badNicknames } from "@/lib/nickname-force";

export const metadata: Metadata = {
  title: "회원 관리",
  robots: { index: false },
};

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

  const bad = await badNicknames(50).catch(() => []);
  const members = await prisma.user.findMany({
    where: {
      isMaster: false,
      ...(query
        ? { nickname: { contains: query, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: [
      { isDealerVerified: "desc" },
      { level: "desc" },
      { nickname: "asc" },
    ],
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
          마스터 계정만 회원에게 골드 뱃지 「인증」을 달거나 뗄 수 있습니다.
          닉네임으로 찾아 직접 설정하세요.
        </p>
        <Link
          href="/admin/banners"
          className="mt-2 inline-flex min-h-11 items-center text-sm text-primary"
        >
          배너 구좌 관리
        </Link>
      </header>
      <form className="flex gap-2" action="/admin/members" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="닉네임 검색"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-[#1a1617] px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          찾기
        </button>
      </form>
      <section
        data-bad-nicknames
        className="grid gap-2 rounded-2xl border border-rose-400/40 bg-rose-950/20 p-4"
      >
        <h2 className="text-lg font-semibold">
          🚫 비속어 · 금지어 의심 닉네임
        </h2>
        <p className="text-xs text-muted-foreground">
          지금 비속어 필터(관리자 금지어 포함)에 걸리는 닉네임이에요. 「닉네임
          강제 변경」을 누르면 「바른닉네임○○○○」로 바뀌고, 그 회원에게 알림 ·
          다음 방문 안내 · 닉네임 변경권 1장이 가요.
        </p>
        {bad.length ? (
          <ul className="grid gap-2">
            {bad.map((b) => (
              <li
                key={b.nickname}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-black/30 px-3 py-2"
              >
                <b className="text-white">{b.nickname}</b>
                <span className="text-xs text-rose-200">{b.reason}</span>
                <span className="ml-auto">
                  <ForceNickname nickname={b.nickname} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-300">걸리는 닉네임이 없어요 👍</p>
        )}
      </section>
      <VerifyMembers members={members} />
    </div>
  );
}
