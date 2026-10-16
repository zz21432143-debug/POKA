import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { MyJobRefresh } from "@/components/jobs/my-job-refresh";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { nowMs, todayKstDate } from "@/lib/dates";
import { jobStatus } from "@/lib/job-status";
import { openSlots } from "@/lib/job-slots";
import { isStaff } from "@/lib/roles";
import { storeLogos, storeLogoId } from "@/lib/job-chat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 구인 공고 · 붙여넣고 갱신", robots: { index: false, follow: false } };

/** 내 구인 공고 한 화면: 매장 공고마다 카톡 일정을 붙여넣으면 바로 갱신 + 맨 위로 */
export default async function MyJobsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return (
      <div className="mx-auto grid max-w-xl gap-3">
        <h1 className="text-2xl font-black text-white">내 구인 공고</h1>
        <Link href="/login?next=/boards/jobs/mine" className="arcade-btn btn-main grid min-h-12 place-items-center">
          로그인하고 내 공고 보기
        </Link>
      </div>
    );
  }
  const staff = isStaff(user);
  const rows = await prisma.post
    .findMany({
      where: {
        boardType: "JOBS",
        hidden: false,
        authorId: user.id,
        NOT: { jobKind: "SEEKING" },
        createdAt: { gte: new Date(nowMs() - 120 * 86_400_000) },
      },
      orderBy: { bumpedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        content: true,
        jobKind: true,
        jobCompanyName: true,
        jobLocation: true,
        jobFilled: true,
        jobDeadline: true,
        jobAlwaysOpen: true,
        jobWorkDate: true,
        jobEndDate: true,
        jobEvents: true,
        jobWorkHours: true,
        jobHeadcount: true,
        createdAt: true,
        bumpedAt: true,
      },
    })
    .catch(() => []);
  const today = todayKstDate();
  const logos = await storeLogos(rows.map((p) => ({ authorId: user.id, company: p.jobCompanyName })));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3" data-my-jobs>
      <header className="board-intro">
        <h1 className="text-2xl font-black text-white">📋 내 구인 공고</h1>
        <p className="mt-1.5 text-sm text-[#d6cdee]">
          새 일정이 오면 공고마다 아래 칸에 카톡 공고를 그대로 붙여넣고 「갱신하고 맨 위로」를 누르세요. 글을 지우고 다시 올릴 필요가 없어요.
          {staff ? " (운영진: 끌어올리기 제한 없음)" : " (끌어올리기는 하루 한 번 · 그 뒤엔 내용만 바뀌어요)"}
        </p>
        <Link href="/boards/jobs/apply/write" className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-[#e7c98a] underline">
          + 새 매장 공고 올리기
        </Link>
      </header>
      {rows.length ? (
        rows.map((p) => {
          const status = jobStatus(p);
          const slots = openSlots(p, today);
          return (
            <MyJobRefresh
              key={p.id}
              id={p.id}
              title={p.title}
              content={p.content ?? ""}
              status={status}
              openSlotCount={slots.length}
              bumpedAt={p.bumpedAt.toISOString()}
              company={p.jobCompanyName}
              logoUrl={p.jobCompanyName ? (logos.get(storeLogoId(user.id, p.jobCompanyName)) ?? null) : null}
            />
          );
        })
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-zinc-300">최근 120일 안에 올린 구인 공고가 없어요.</p>
      )}
    </div>
  );
}
