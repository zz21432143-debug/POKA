import Link from "next/link";
import { notFound } from "next/navigation";
import { JobCards } from "@/components/jobs/job-cards";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { resolveJobKind } from "@/lib/nav";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function JobBoardPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();

  let jobs: {
    id: string;
    title: string;
    jobKind: string | null;
    jobLocation: string | null;
    jobPay: string | null;
    jobSchedule: string | null;
    jobHeadcount: string | null;
    isPaid: boolean;
    authorNickname: string | null;
    authorLevel: number | null;
    authorMark: string | null;
  }[] = [];
  try {
    const rows = await prisma.post.findMany({
      where: { boardType: "JOBS", jobKind: job.kind },
      orderBy: [{ isPaid: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { nickname: true, level: true, profileMarkImageUrl: true } } },
    });
    jobs = rows.map((post) => ({
      id: post.id,
      title: post.title,
      jobKind: post.jobKind,
      jobLocation: post.jobLocation,
      jobPay: post.jobPay,
      jobSchedule: post.jobSchedule,
      jobHeadcount: post.jobHeadcount,
      isPaid: post.isPaid,
      authorNickname: post.author?.nickname ?? null,
      authorLevel: post.author?.level ?? null,
      authorMark: post.author?.profileMarkImageUrl ?? null,
    }));
  } catch {
    jobs = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.blurb}. 유료 고정(is_paid) 글이 위에 표시됩니다.
          </p>
        </div>
        <Link
          href={`/boards/jobs/${kind}/write`}
          className={cn(buttonVariants({ size: "touch" }), "inline-flex")}
        >
          구인 등록
        </Link>
      </header>
      <JobCards jobs={jobs} />
    </div>
  );
}
