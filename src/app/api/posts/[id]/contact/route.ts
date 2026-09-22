import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인 후 연락처를 볼 수 있습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
      select: { boardType: true, hidden: true, jobContact: true, jobApplyValue: true, jobApplyMethod: true },
    });
    const listing = post && ["JOBS", "TALENT", "PICKUP"].includes(post.boardType);
    if (!post || !listing || post.hidden) {
      return NextResponse.json({ error: "구인 글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.jobApplyMethod === "사이트 내 직접 지원") {
      return NextResponse.json({ contact: "이 공고는 게시글 댓글로 직접 지원합니다." });
    }
    const contact = post.jobApplyValue || post.jobContact;
    if (!contact) {
      return NextResponse.json({ error: "등록된 연락처가 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "연락처를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
