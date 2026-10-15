import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { normalizeNickname } from "@/lib/nickname";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { ForceNickname } from "@/components/admin/force-nickname";
import { badNicknames } from "@/lib/nickname-force";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "회원 목록", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE = 50;
const SORTS = {
  recent: { label: "최근 가입", orderBy: [{ createdAt: "desc" }] },
  login: { label: "최근 접속", orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }] },
  level: { label: "레벨", orderBy: [{ level: "desc" }, { exp: "desc" }] },
  points: { label: "포인트", orderBy: [{ points: "desc" }] },
} as const;
type SortKey = keyof typeof SORTS;

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit" }).format(d) : "-");

/** 회원 목록(마스터): 검색 · 정렬 · 쪽 나눔 · 인증 뱃지 · 닉네임 강제 변경 · 제재로 이동, 위에 비속어 의심 닉네임 */
export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) notFound();
  const sp = await searchParams;
  const query = normalizeNickname(sp.q ?? "");
  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "recent";
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const where: Prisma.UserWhereInput = {
    isMaster: false,
    withdrawnAt: null,
    ...(query ? { OR: [{ nickname: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}),
  };
  const [total, members, bad] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [...SORTS[sort].orderBy] as unknown as Prisma.UserOrderByWithRelationInput[],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, nickname: true, level: true, points: true, createdAt: true, lastLoginAt: true, isDealerVerified: true, isAdmin: true, status: true },
    }),
    badNicknames(50).catch(() => []),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: Record<string, string | number>) => {
    const u = new URLSearchParams({ ...(query ? { q: query } : {}), sort, page: String(page), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/admin/members?${u.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">👥 회원 목록 · 닉네임</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회원을 찾아 <b className="text-white">인증 뱃지</b>를 달거나, 문제 있는 닉네임을 <b className="text-white">강제 변경</b>(「바른닉네임○○○○」 + 변경권 1장 + 알림)할 수 있어요. 정지 · 차단은 「제재」에서.
        </p>
      </header>

      <section id="bad" data-bad-nicknames className="grid scroll-mt-24 gap-2 rounded-2xl border border-rose-400/40 bg-rose-950/20 p-4">
        <h2 className="text-lg font-semibold">🚫 비속어 · 금지어 의심 닉네임 {bad.length ? `(${bad.length})` : ""}</h2>
        <p className="text-xs text-muted-foreground">지금 비속어 필터(관리자 금지어 포함)에 걸리는 닉네임이에요. 바꾸면 사이트 곳곳에 남은 옛 닉네임도 새 닉네임으로 바뀌어요.</p>
        {bad.length ? (
          <ul className="grid gap-2">
            {bad.map((b) => (
              <li key={b.nickname} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/30 px-3 py-2">
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

      <section className="grid gap-3 rounded-2xl border border-border bg-[#151213] p-4">
        <form className="flex flex-wrap gap-2" action="/admin/members" method="get">
          <input type="search" name="q" defaultValue={query} placeholder="닉네임 · 이메일 검색" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-[#1a1617] px-3 text-sm" />
          <input type="hidden" name="sort" value={sort} />
          <button type="submit" className="inline-flex h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
            찾기
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">정렬</span>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <Link key={k} href={link({ sort: k, page: 1 })} className={k === sort ? "rounded-full bg-primary px-3 py-1 font-semibold text-white" : "rounded-full border border-border px-3 py-1 hover:bg-muted"}>
              {SORTS[k].label}
            </Link>
          ))}
          <span className="ml-auto text-muted-foreground">
            {query ? `「${query}」 ` : ""}회원 {total.toLocaleString()}명
          </span>
        </div>

        {members.length ? (
          <ul data-member-list className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {members.map((m) => (
              <li key={m.nickname} data-member-row={m.nickname} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <Link
                    href={`/admin/members/${m.id}`} className="truncate font-semibold hover:text-primary">
                    {m.nickname}
                    {m.isDealerVerified ? <span className="ml-1.5 rounded bg-[#c9a25c] px-1 text-[10px] text-black">인증</span> : null}
                    {m.isAdmin ? <span className="ml-1 rounded bg-sky-700 px-1 text-[10px]">관리자</span> : null}
                    {m.status !== "ACTIVE" ? <span className="ml-1 rounded bg-rose-700 px-1 text-[10px]">{m.status === "BANNED" ? "차단" : "정지"}</span> : null}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    Lv.{m.level} · {m.points.toLocaleString()}P · 가입 {fmt(m.createdAt)} · 접속 {fmt(m.lastLoginAt)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <VerifyToggle nickname={m.nickname} verified={m.isDealerVerified} />
                  <ForceNickname nickname={m.nickname} />
                  <Link href={`/admin?tab=sanctions&q=${encodeURIComponent(m.nickname)}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-bold">
                    제재
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">찾는 회원이 없어요.</p>
        )}

        {pages > 1 ? (
          <nav className="flex items-center justify-center gap-2 text-sm" aria-label="쪽">
            {page > 1 ? (
              <Link href={link({ page: page - 1 })} className="rounded-lg border border-border px-3 py-2">
                ‹ 이전
              </Link>
            ) : null}
            <span>
              {page} / {pages}
            </span>
            {page < pages ? (
              <Link href={link({ page: page + 1 })} className="rounded-lg border border-border px-3 py-2">
                다음 ›
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
