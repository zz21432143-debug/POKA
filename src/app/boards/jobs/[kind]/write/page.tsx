import { notFound } from "next/navigation";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { resolveJobKind } from "@/lib/nav";

export default async function JobWritePage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{job.title} 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">{job.blurb}</p>
      </header>
      <BoardWriteForm
        boardType="JOBS"
        jobKind={job.kind}
        hint="조건 요약 카드에 지역·페이·일정·인원이 표시됩니다"
      />
    </div>
  );
}
