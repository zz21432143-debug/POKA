import Link from "next/link";
import { notFound } from "next/navigation";
import { JobCards, type JobCardData } from "@/components/jobs/job-cards";
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

  const rows = await prisma.post.findMany({
    where: { boardType: "JOBS", jobKind: job.kind, hidden: false },
    orderBy: [{ isPaid: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { nickname: true, level: true, profileMarkImageUrl: true } } },
  });
  const jobs: JobCardData[] = rows.map((post) => ({
    id: post.id,
    title: post.title,
    isPaid: post.isPaid,
    authorNickname: post.author?.nickname ?? null,
    authorLevel: post.author?.level ?? null,
    jobKind: post.jobKind,
    jobLocation: post.jobLocation,
    jobCompanyName: post.jobCompanyName,
    jobPayType: post.jobPayType,
    jobPayAmount: post.jobPayAmount,
    jobSchedule: post.jobSchedule,
    jobWorkHours: post.jobWorkHours,
    jobBenefits: post.jobBenefits,
    jobExperience: post.jobExperience,
    jobWorkDate: post.jobWorkDate,
    jobDateFlexible: post.jobDateFlexible,
    jobGuaranteedHours: post.jobGuaranteedHours,
    jobOvertime: post.jobOvertime,
    jobTravelPay: post.jobTravelPay,
    jobSnacks: post.jobSnacks,
    jobDressCode: post.jobDressCode,
    jobApplyMethod: post.jobApplyMethod,
  }));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.blurb}. 제목은 지역·상호(조건)로 자동 붙습니다. 연락처는 로그인 후 공개됩니다.
          </p>
        </div>
        <Link
          href={`/boards/jobs/${kind}/write`}
          className={cn(buttonVariants({ size: "touch" }), "inline-flex")}
        >
          {job.cta}
        </Link>
      </header>
      <JobCards jobs={jobs} />
    </div>
  );
}
