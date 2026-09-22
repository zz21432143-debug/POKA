import { notFound } from "next/navigation";
import { JobWriteForm } from "@/components/jobs/job-write-form";
import { resolveJobKind } from "@/lib/nav";

export default async function JobWritePage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();

  const hints = {
    FIXED: "근무지와 상호명으로 제목이 만들어집니다. 연락처는 로그인 회원만 볼 수 있습니다.",
    APPLY: "희망 근무지와 시급으로 제목이 만들어집니다.",
    TEAM: "주요 활동 지역과 팀 명으로 제목이 만들어집니다.",
  } as const;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{job.title} 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">{job.blurb}</p>
      </header>
      <JobWriteForm jobKind={job.kind} hint={hints[job.kind]} />
    </div>
  );
}
