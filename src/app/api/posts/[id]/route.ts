import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { listingFromBody } from "@/lib/listing";

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

    const body = (await request.json()) as Record<string, unknown> & { content?: string };
    const listing = listingFromBody(body);
    if (!listing.title || listing.title.length < 2) {
      return NextResponse.json({ error: "공고 제목을 입력하세요." }, { status: 400 });
    }
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: listing.title,
        content: typeof body.content === "string" ? body.content : post.content,
        jobKind: null,
        jobLocation: listing.jobLocation,
        jobPay: listing.jobPay,
        jobBenefits: listing.jobBenefits,
        jobPayType: listing.jobPayType,
        jobPayAmount: listing.jobPayAmount,
        jobExperience: listing.jobExperience,
        jobContact: listing.jobContact,
        jobWorkDate: listing.jobWorkDate,
        jobDateFlexible: listing.jobDateFlexible,
        jobApplyMethod: listing.jobApplyMethod,
        jobApplyValue: listing.jobApplyValue,
        jobPositions: listing.jobPositions,
        jobWorkType: listing.jobWorkType,
        jobAlwaysOpen: listing.jobAlwaysOpen,
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "수정에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
