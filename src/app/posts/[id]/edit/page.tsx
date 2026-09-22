import { notFound, redirect } from "next/navigation";
import { JobWriteForm } from "@/components/jobs/job-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.boardType !== "JOBS" || !post.jobKind) notFound();
  if (!viewer || (post.authorId !== viewer.id && !viewer.isAdmin)) {
    redirect(`/posts/${id}`);
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
          jobPayType: post.jobPayType ?? (post.jobKind === "APPLY" ? "시급" : "월급"),
          jobPayAmount: post.jobPayAmount ?? "",
          jobSchedule: post.jobSchedule ?? "",
          jobWorkHours: post.jobWorkHours ?? "",
          jobBenefits: post.jobBenefits ?? "",
          jobExperience: post.jobExperience ?? "",
          jobContact: post.jobContact ?? "",
          jobWorkDate: post.jobWorkDate ?? "",
          jobDateFlexible: post.jobDateFlexible,
          jobGuaranteedHours: post.jobGuaranteedHours ?? "",
          jobOvertime: post.jobOvertime ?? "가능",
          jobTravelPay: post.jobTravelPay,
          jobSnacks: post.jobSnacks,
          jobDressCode: post.jobDressCode ?? "",
          jobApplyMethod: post.jobApplyMethod ?? "",
          content: post.content,
          isPaid: post.isPaid,
        }}
      />
    </div>
  );
}
