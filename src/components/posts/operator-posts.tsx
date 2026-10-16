import Link from "@/components/ui/link";
import { prisma } from "@/lib/db";

/** 딜러 가이드 아래: 운영자가 정리한 커뮤니티 글(질문 · 공지) — 가이드 ↔ 커뮤니티 글을 서로 이어 줌 */
export async function OperatorPosts() {
  const rows = await prisma.post
    .findMany({
      where: { hidden: false, isPrivate: false, isAttendanceThread: false, boardType: { in: ["RULE_QA", "NOTICE"] }, author: { isMaster: true } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true },
    })
    .catch(() => []);
  if (!rows.length) return null;
  return (
    <section aria-label="커뮤니티 정리 글" data-operator-posts className="grid gap-1.5">
      <h2 className="text-base font-bold text-white">커뮤니티 정리 글</h2>
      <ul className="grid gap-0.5">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/posts/${p.id}`} className="inline-flex min-h-10 items-center text-[15px] text-[#E5E7EB] hover:text-[#e7c98a]">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
