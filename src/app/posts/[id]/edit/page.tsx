import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobWriteForm } from "@/components/jobs/job-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { replaceTo, replaceToLogin } from "@/lib/history-redirect";
import { prisma } from "@/lib/db";
import { parseJobEvents } from "@/lib/job-events";
import { TdaWriteForm } from "@/components/tda/tda-write-form";
import { canWriteBoard } from "@/lib/permissions";

export const metadata: Metadata = { title: "글 수정", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) replaceToLogin(`/posts/${id}/edit`);
  const post = await prisma.post.findUnique({ where: { id } });
  // TDA 룰은 마스터(POKA 공식 계정)만 수정·삭제합니다.
  if (post && post.boardType === "TDA" && !post.hidden) {
    if (!canWriteBoard(viewer, "TDA")) replaceTo(`/posts/${id}`);
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold">TDA 룰 수정</h1>
        </header>
        <TdaWriteForm
          hint="POKA 공식 계정만 수정·삭제할 수 있습니다."
          postId={post.id}
          initial={{ title: post.title, content: post.content, pdfUrl: post.docPdfUrl }}
        />
      </div>
    );
  }
  if (!post || post.boardType !== "JOBS" || !post.jobKind) notFound();
  if (post.authorId !== viewer.id && !viewer.isAdmin) {
    replaceTo(`/posts/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">구인 글 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">제목은 입력값을 기준으로 다시 만들어집니다.</p>
      </header>
      <JobWriteForm
        jobKind={post.jobKind}
        hint="저장하면 목록 제목도 함께 갱신됩니다."
        postId={post.id}
        initial={{
          jobLocation: post.jobLocation ?? "",
          jobCompanyName: post.jobCompanyName ?? "",
          jobPayType: post.jobPayType ?? (post.jobKind === "APPLY" || post.jobKind === "TOURNAMENT" ? "시급" : "월급"),
          jobPayAmount: post.jobPayAmount ?? "",
          jobSchedule: post.jobSchedule ?? "",
          jobWorkHours: post.jobWorkHours ?? "",
          jobBenefits: post.jobBenefits ?? "",
          jobExperience: post.jobExperience ?? "",
          jobContact: post.jobContact ?? "",
          jobWorkDate: post.jobWorkDate ?? "",
          jobEndDate: post.jobEndDate ?? "",
          jobEvents: parseJobEvents(post.jobEvents),
          jobDeadline: post.jobDeadline ?? "",
          jobAlwaysOpen: post.jobAlwaysOpen,
          jobHeadcount: post.jobHeadcount ?? "",
          jobApplyValue: post.jobApplyValue ?? "",
          jobDateFlexible: post.jobDateFlexible,
          jobGuaranteedHours: post.jobGuaranteedHours ?? "",
          jobOvertime: post.jobOvertime ?? "가능",
          jobTravelPay: post.jobTravelPay,
          jobTravelPayAmount: post.jobTravelPayAmount ?? "",
          jobSnacks: post.jobSnacks,
          jobDressCode: post.jobDressCode ?? "",
          jobApplyMethod: post.jobApplyMethod ?? "",
          content: post.content,
        }}
      />
    </div>
  );
}
