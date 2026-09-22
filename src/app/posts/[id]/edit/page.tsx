import { notFound, redirect } from "next/navigation";
import { HireForm } from "@/components/listing/hire-form";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { splitCsv, type CareerReq, type HireListing, type PayType, type WorkType, type ApplyMethod } from "@/lib/listing";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.boardType !== "JOBS") notFound();
  if (!viewer || (post.authorId !== viewer.id && !viewer.isAdmin)) {
    redirect(`/posts/${id}`);
  }

  const initial: Partial<HireListing> = {
    title: post.title,
    content: post.content,
    jobPositions: splitCsv(post.jobPositions),
    jobLocation: splitCsv(post.jobLocation),
    jobWorkType: (post.jobWorkType as WorkType) || "",
    jobExperience: (post.jobExperience as CareerReq) || "",
    jobPayType: (post.jobPayType as PayType) || "",
    jobPayAmount: post.jobPayAmount ?? "",
    jobBenefits: splitCsv(post.jobBenefits),
    jobApplyMethod: (post.jobApplyMethod as ApplyMethod) || "",
    jobApplyValue: post.jobApplyValue ?? post.jobContact ?? "",
    jobWorkDate: post.jobWorkDate ?? "",
    jobAlwaysOpen: post.jobAlwaysOpen,
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">구인 공고 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">포지션·지역·급여 조건을 다시 저장합니다.</p>
      </header>
      <HireForm hint="수정 후에도 목록 카드에 같은 조건이 표시됩니다." postId={post.id} initial={initial} />
    </div>
  );
}
