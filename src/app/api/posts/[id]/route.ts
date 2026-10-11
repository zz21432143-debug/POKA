import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { jobFieldsFromBody } from "@/lib/job-fields";
import { ForbiddenWordError, assertNoForbiddenWords } from "@/lib/forbidden-words";
import { HoldemOnlyError, assertHoldemOnly } from "@/lib/holdem-only";
import type { JobKind } from "@/generated/prisma/enums";

const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM", "URGENT", "SEEKING", "TOURNAMENT"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.authorId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "작성자만 수정할 수 있습니다." }, { status: 403 });
    }
    if (post.boardType !== "JOBS") {
      return NextResponse.json({ error: "이 글은 구인 수정만 지원합니다." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown> & { jobKind?: JobKind; content?: string };
    const jobKind = (body.jobKind && JOB_KINDS.includes(body.jobKind) ? body.jobKind : post.jobKind) as JobKind | null;
    if (!jobKind) {
      return NextResponse.json({ error: "구인 종류를 확인하세요." }, { status: 400 });
    }
    const jobData = jobFieldsFromBody(body, jobKind);
    if (!jobData.jobLocation) {
      return NextResponse.json({ error: "지역을 선택하세요." }, { status: 400 });
    }
    // 수정할 때도 새로 쓸 때와 같은 금지어 검사를 합니다.
    const nextContent = typeof body.content === "string" ? body.content : post.content;
    assertHoldemOnly(jobData.title, nextContent, jobData.jobLocation, jobData.jobCompanyName);
    await assertNoForbiddenWords(jobData.title, nextContent, jobData.jobLocation, jobData.jobCompanyName);
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: jobData.title,
        content: typeof body.content === "string" ? body.content : post.content,
        jobKind,
        jobLocation: jobData.jobLocation,
        jobCompanyName: jobData.jobCompanyName,
        jobPayType: jobData.jobPayType,
        jobPayAmount: jobData.jobPayAmount,
        jobSchedule: jobData.jobSchedule,
        jobWorkHours: jobData.jobWorkHours,
        jobBenefits: jobData.jobBenefits,
        jobExperience: jobData.jobExperience,
        jobContact: jobData.jobContact,
        jobWorkDate: jobData.jobWorkDate,
        jobEndDate: jobData.jobEndDate,
        jobDeadline: jobData.jobDeadline,
        jobAlwaysOpen: jobData.jobAlwaysOpen,
        jobHeadcount: jobData.jobHeadcount,
        jobApplyValue: jobData.jobApplyValue,
        jobDateFlexible: jobData.jobDateFlexible,
        jobGuaranteedHours: jobData.jobGuaranteedHours,
        jobOvertime: jobData.jobOvertime,
        jobTravelPay: jobData.jobTravelPay,
        jobTravelPayAmount: jobData.jobTravelPayAmount,
        jobSnacks: jobData.jobSnacks,
        jobDressCode: jobData.jobDressCode,
        jobApplyMethod: jobData.jobApplyMethod,
        jobPay: jobData.jobPay,
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    if (error instanceof ForbiddenWordError || error instanceof HoldemOnlyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "수정에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
