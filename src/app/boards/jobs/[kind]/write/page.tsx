import { BackToList } from "@/components/posts/back-to-list";
import { notFound } from "next/navigation";
import { RequireLogin } from "@/components/auth/require-login";
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
    URGENT: "근무지와 필요 날짜로 제목이 만들어집니다. 당일 대타·급구용입니다.",
    SEEKING: "희망 지역과 표시 이름으로 제목이 만들어집니다.",
  } as const;

  return (
    <RequireLogin>
    <div className="flex flex-col gap-4">
      <BackToList href={`/boards/jobs/${kind}`} className="self-start" />
      <header className="board-intro">
        <h1>{job.title} 작성</h1>
        <p className="mt-2">{job.blurb}</p>
      </header>
      <JobWriteForm jobKind={job.kind} hint={hints[job.kind]} />
    </div>
    </RequireLogin>
  );
}
